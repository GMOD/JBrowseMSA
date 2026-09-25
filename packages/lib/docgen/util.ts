import { exec } from 'child_process'
import { promisify } from 'util'

// TypeScript 7 is the native compiler and exposes no JS API -- no
// createProgram, no checker, no scanner -- so the generator reads the AST with
// an aliased TypeScript 6. The repo still typechecks with 7; this is only the
// docgen's parser.
import * as ts from 'typescript6'

const exec2 = promisify(exec)

export type TagType = (typeof TAG_TYPES)[number]

// A model referenced inside a `types.compose(...)` call, identified by
// declaration identity and/or resolved name so the generator can match it back
// to the #stateModel page that documents it.
export interface ComposedRef {
  declId?: string
  name?: string
}

export interface Example {
  label: string
  content: string
}

export interface ExtractedNode {
  type: TagType
  name: string
  comment: string
  signature: string
  node: string
  filename: string
  // "file:pos" of this node's own declaration; used to match composed refs back
  // to their model page by declaration identity rather than textual name.
  selfDeclId?: string
  // For #stateModel nodes: models passed to types.compose(), alias-followed.
  // Derived from code so the composition graph doesn't need to be hand-authored.
  composedOf?: ComposedRef[]
}

const TAG_TYPES = [
  'stateModel',
  'property',
  'volatile',
  'getter',
  'action',
  'method',
] as const

export function extractWithComment(
  fileNames: string[],
  cb: (obj: ExtractedNode) => void,
  options: ts.CompilerOptions = {},
) {
  const program = ts.createProgram(fileNames, options)
  const checker = program.getTypeChecker()

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, visit)
    }
  }

  function visit(node: ts.Node) {
    const comment = getOwnJSDocText(node)
    const tags = comment ? TAG_TYPES.filter(t => hasTag(comment, t)) : []
    if (tags.length) {
      const { name, signature, declId } = describeSymbol(checker, node)
      const base = {
        name,
        comment,
        signature,
        node: node.getFullText(),
        filename: node.getSourceFile().fileName,
        selfDeclId: declId,
        composedOf: tags.includes('stateModel')
          ? resolveComposedModels(checker, node)
          : undefined,
      }
      for (const type of tags) {
        cb({ type, ...base })
      }
    }
    ts.forEachChild(node, visit)
  }
}

function describeSymbol(checker: ts.TypeChecker, node: ts.Node) {
  const nameNode = getNameNode(node)
  const symbol = nameNode ? checker.getSymbolAtLocation(nameNode) : undefined
  const decl = symbol?.valueDeclaration
  return {
    name: symbol?.getName() ?? '',
    signature: symbol && decl ? typeSignature(checker, symbol, decl) : '',
    declId: symbolDeclId(checker, symbol),
  }
}

// typeToString truncates past ~340 characters mid-token, leaving unbalanced
// brackets and half a word. Print the whole type and shorten it structurally
// instead, so what is left still reads as a type.
function typeSignature(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  decl: ts.Declaration,
) {
  return elideSignature(
    sortStringLiteralUnions(
      checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, decl),
        undefined,
        ts.TypeFormatFlags.NoTruncation,
      ),
    ),
  )
}

// The checker prints a union in the order the program met its members, which
// moves when an unrelated file changes. Sorting runs of string literals keeps a
// stringEnum's choices from churning the docs.
const STRING_LITERAL_UNION = /"(?:[^"\\]|\\.)*"(?:\s*\|\s*"(?:[^"\\]|\\.)*")+/g

export function sortStringLiteralUnions(sig: string) {
  return sig.replaceAll(STRING_LITERAL_UNION, run =>
    run
      .split('|')
      .map(m => m.trim())
      .toSorted()
      .join(' | '),
  )
}

const MAX_SIGNATURE = 180

// Collapse `<...>` or `{...}` groups innermost first until the string fits. The
// `>` of a `=>` is not a bracket.
function elideGroups(sig: string, open: string, close: string, max: number) {
  let length = sig.length
  const enclosing: string[] = []
  let out = ''
  for (let i = 0; i < sig.length; i++) {
    const c = sig[i]!
    if (c === open) {
      enclosing.push(out)
      out = ''
    } else if (
      c === close &&
      enclosing.length &&
      !(close === '>' && sig[i - 1] === '=')
    ) {
      const inner = out
      out = enclosing.pop()!
      if (length > max) {
        length -= inner.length - 1
        out += `${open}…${close}`
      } else {
        out += `${open}${inner}${close}`
      }
    } else {
      out += c
    }
  }
  while (enclosing.length) {
    out = `${enclosing.pop()!}${open}${out}`
  }
  return out
}

function topLevelUnion(sig: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < sig.length; i++) {
    const c = sig[i]!
    if ('<{(['.includes(c)) {
      depth++
    } else if ('>})]'.includes(c)) {
      if (!(c === '>' && sig[i - 1] === '=')) {
        depth--
      }
    } else if (c === '|' && depth === 0) {
      parts.push(sig.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(sig.slice(start).trim())
  return parts
}

// Generic arguments collapse first, then object types, then a top-level union
// drops its trailing alternatives. A type that resists all three stays whole:
// an honest long signature beats one cut off mid-parameter.
export function elideSignature(sig: string, max = MAX_SIGNATURE) {
  let out = sig.replaceAll(/\s+/g, ' ')
  for (const [open, close] of [
    ['<', '>'],
    ['{', '}'],
  ] as const) {
    if (out.length > max) {
      out = elideGroups(out, open, close, max)
    }
  }
  if (out.length > max) {
    const parts = topLevelUnion(out)
    const kept = parts.filter(
      (_, i) => i === 0 || parts.slice(0, i + 1).join(' | ').length + 4 <= max,
    )
    out = kept.length < parts.length ? `${kept.join(' | ')} | …` : out
  }
  return out
}

// Follow import aliases to the original symbol so two references to the same
// declaration (under different local/imported names) resolve identically.
function followAlias(checker: ts.TypeChecker, symbol: ts.Symbol) {
  let s = symbol
  while (s.flags & ts.SymbolFlags.Alias) {
    const aliased = checker.getAliasedSymbol(s)
    if (aliased === s) {
      break
    }
    s = aliased
  }
  return s
}

// "file:pos" of the declaration a symbol resolves to, alias-followed.
function symbolDeclId(checker: ts.TypeChecker, symbol: ts.Symbol | undefined) {
  if (!symbol) {
    return undefined
  }
  const s = followAlias(checker, symbol)
  const decl = s.declarations?.[0] ?? s.valueDeclaration
  return decl
    ? `${decl.getSourceFile().fileName}:${decl.getStart()}`
    : undefined
}

// The models a `#stateModel` declaration composes, derived from its
// `types.compose(...)` call. Each argument is alias-followed; call expressions
// like `MSAModelF()` reduce to their callee identifier `MSAModelF`. String
// literals and inline `types.model(...)` (any `types.*` member) are skipped.
//
// Also handles Pattern B: `return BaseFactory(args).views(...).actions(...)` —
// a model built by chaining onto another factory's result. The chain root is
// treated as a composed base.
function resolveComposedModels(checker: ts.TypeChecker, node: ts.Node) {
  const out: ComposedRef[] = []
  const seen = new Set<string>()
  const add = (ref: ComposedRef | undefined) => {
    const key = ref && (ref.declId ?? ref.name)
    if (ref && key && !seen.has(key)) {
      seen.add(key)
      out.push(ref)
    }
  }
  const walk = (n: ts.Node) => {
    if (ts.isCallExpression(n) && isTypesMember(n.expression, 'compose')) {
      for (const arg of n.arguments) {
        add(composedArgRef(checker, arg))
      }
    }
    ts.forEachChild(n, walk)
  }
  walk(node)
  add(returnedBaseRef(checker, node))
  return out
}

// Pattern B: the base factory a model extends by chaining .views()/.actions()
// onto another factory's result.
function returnedBaseRef(checker: ts.TypeChecker, node: ts.Node) {
  const fn = factoryFunction(node)
  const ret = fn && returnedExpression(fn)
  if (!ret) {
    return undefined
  }
  let expr: ts.Expression = ret
  while (
    ts.isCallExpression(expr) &&
    ts.isPropertyAccessExpression(expr.expression) &&
    ts.isCallExpression(expr.expression.expression)
  ) {
    expr = expr.expression.expression
  }
  return ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)
    ? identifierRef(checker, expr.expression)
    : undefined
}

function factoryFunction(node: ts.Node) {
  if (ts.isFunctionDeclaration(node)) {
    return node
  }
  if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) ||
      ts.isFunctionExpression(node.initializer))
  ) {
    return node.initializer
  }
  return undefined
}

function returnedExpression(fn: ts.FunctionLikeDeclaration) {
  const body = fn.body
  if (body && !ts.isBlock(body)) {
    return body
  }
  return body?.statements.find(ts.isReturnStatement)?.expression
}

function isTypesMember(expr: ts.Expression, name: string) {
  return (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === 'types' &&
    expr.name.text === name
  )
}

function composedArgRef(
  checker: ts.TypeChecker,
  arg: ts.Expression,
): ComposedRef | undefined {
  let expr: ts.Expression = arg
  while (ts.isCallExpression(expr) || ts.isNonNullExpression(expr)) {
    expr = expr.expression
  }
  return ts.isIdentifier(expr) ? identifierRef(checker, expr) : undefined
}

// Resolve an identifier to a ComposedRef. When it resolves to a
// `const X = Factory(...)` variable, follow the initializer to the factory
// identifier so the declId matches the factory's #stateModel page.
function identifierRef(
  checker: ts.TypeChecker,
  id: ts.Identifier,
  depth = 0,
): ComposedRef | undefined {
  const symbol = checker.getSymbolAtLocation(id)
  if (!symbol) {
    return undefined
  }
  const aliased = followAlias(checker, symbol)
  const decl = aliased.declarations?.[0]
  if (depth < 3 && decl && ts.isVariableDeclaration(decl) && decl.initializer) {
    let init: ts.Expression = decl.initializer
    while (ts.isCallExpression(init) || ts.isNonNullExpression(init)) {
      init = init.expression
    }
    const followed = ts.isIdentifier(init)
      ? identifierRef(checker, init, depth + 1)
      : undefined
    if (followed) {
      return followed
    }
  }
  return { declId: symbolDeclId(checker, aliased), name: aliased.getName() }
}

function hasTag(comment: string, tag: TagType) {
  return comment.split('\n').some(line => startsWithTag(line, tag))
}

// A tag counts only where it heads its line, so prose that mentions `#getter`
// is not parsed as one, and `#getter` does not match `#getterById`
function startsWithTag(line: string, tag: string) {
  return new RegExp(`^\\s*\\*?\\s*#${tag}(?![A-Za-z0-9_])`).test(line)
}

function getNameNode(node: ts.Node): ts.Node | undefined {
  if (
    'name' in node &&
    node.name &&
    typeof node.name === 'object' &&
    'kind' in node.name
  ) {
    return node.name as ts.Node
  }
  return undefined
}

// JSDoc body text directly attached to this node (not inherited from ancestors).
// For VariableDeclaration, the JSDoc above `const Foo = ...` attaches to the
// parent VariableStatement, so we look there instead.
function getOwnJSDocText(node: ts.Node): string {
  const target: ts.Node = ts.isVariableDeclaration(node)
    ? node.parent.parent
    : node
  const jsDoc = (target as { jsDoc?: ts.JSDoc[] }).jsDoc
  if (!jsDoc) {
    return ''
  }
  return jsDoc
    .map(jd =>
      typeof jd.comment === 'string'
        ? jd.comment
        : (jd.comment?.map(p => p.text).join('') ?? ''),
    )
    .join('\n')
}

// Extract the entity name, human-readable description, and optional #example
// blocks from a comment. Examples are authored last in the JSDoc block.
// Multiple #example blocks are supported; an optional label follows the tag
// (#example minimal, #example full).
export function parseTaggedComment(
  comment: string,
  type: TagType,
  fallbackName: string,
) {
  const tag = `#${type}`
  const lines = comment.split('\n')
  let name = fallbackName
  const docs: string[] = []
  const examples: Example[] = []
  let current: { label: string; lines: string[] } | undefined
  for (const line of lines) {
    if (startsWithTag(line, 'example')) {
      if (current) {
        examples.push({
          label: current.label,
          content: current.lines.join('\n').trim(),
        })
      }
      current = { label: line.replace(/^.*?#example\s*/, '').trim(), lines: [] }
    } else if (startsWithTag(line, type)) {
      const fromTag = line.replace(new RegExp(`^.*?${tag}\\s*`), '').trim()
      if (fromTag) {
        name = fromTag
      }
    } else if (current) {
      current.lines.push(line)
    } else {
      docs.push(line)
    }
  }
  if (current) {
    examples.push({
      label: current.label,
      content: current.lines.join('\n').trim(),
    })
  }
  return { name, docs: docs.join('\n'), examples }
}

// Token-aware comment removal via the TS scanner, so `//` inside string
// literals (e.g. a URL in a slot defaultValue) is preserved.
export function removeComments(string: string) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ false,
    ts.LanguageVariant.Standard,
    string,
  )
  let out = ''
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    const isComment =
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    if (!isComment) {
      out += scanner.getTokenText()
    }
  }
  return dedentContinuation(out.trim())
}

// A member's first line starts at the extracted node, and the lines after it
// keep the indentation of the file they came from. Shift them to sit one level
// under the first.
function dedentContinuation(code: string) {
  const [first, ...rest] = code.split('\n')
  const indents = rest.filter(l => l.trim()).map(l => /^ */.exec(l)![0].length)
  const shift = indents.length ? Math.max(Math.min(...indents) - 2, 0) : 0
  return [first, ...rest.map(l => l.slice(shift))].join('\n')
}

export function codeBlock(...lines: string[]) {
  return ['```js', ...lines, '```'].join('\n')
}

// Join non-empty parts with blank lines between them.
export function section(...parts: (string | false | 0 | undefined)[]) {
  return parts.filter(Boolean).join('\n\n')
}

export function overviewSection(...parts: (string | false | 0 | undefined)[]) {
  const body = section(...parts)
  return body ? `## Overview\n\n${body}` : ''
}

// Render authored #example blocks under a heading.
export function exampleSection(
  examples: Example[],
  heading = '## Example usage',
) {
  if (!examples.length) {
    return ''
  }
  const levelMatch = /^(#+)/.exec(heading)
  const subPrefix = levelMatch
    ? '#'.repeat(levelMatch[1]!.length + 1)
    : undefined
  const labelHeading = (label: string) =>
    label ? (subPrefix ? `${subPrefix} Example: ${label}` : `_${label}_`) : ''
  const bodies = examples.map(ex => section(labelHeading(ex.label), ex.content))
  return section(heading, ...bodies)
}

// Strip a hand-authored `extends` / `composed of` bullet list from a
// #stateModel doc string. Composition is now derived from code, so the manual
// block would duplicate the generated "Inherited members" section.
export function stripComposedBlock(docs: string) {
  const lines = docs.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    if (/^[^\S\n]*(?:extends|composed of)\b/.test(lines[i]!)) {
      i++
      while (
        i < lines.length &&
        (/^\s*$/.test(lines[i]!) ||
          /^\s*-\s/.test(lines[i]!) ||
          /^\s+\S/.test(lines[i]!))
      ) {
        i++
      }
    } else {
      out.push(lines[i]!)
      i++
    }
  }
  return out.join('\n').trim()
}

export async function getAllFiles() {
  const { stdout } = await exec2(
    String.raw`git ls-files src | grep "\(t\|j\)sx\?$"`,
  )
  return stdout.split('\n').filter(Boolean)
}

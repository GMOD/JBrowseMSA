import fs from 'fs'

import slugify from 'slugify'

import {
  codeBlock,
  exampleSection,
  extractWithComment,
  getAllFiles,
  overviewSection,
  parseTaggedComment,
  removeComments,
  section,
  stripComposedBlock,
} from './util.ts'

import type { ComposedRef, Example, ExtractedNode } from './util.ts'

interface Member {
  name: string
  docs: string
  examples: Example[]
  code: string
  signature: string
}
interface ModelHeader {
  name: string
  id: string
  docs: string
  examples: Example[]
  selfDeclId?: string
  composedOf: ComposedRef[]
}
interface StateModel {
  header?: ModelHeader
  properties: Member[]
  volatiles: Member[]
  getters: Member[]
  methods: Member[]
  actions: Member[]
  filename: string
}
type ModelWithHeader = StateModel & { header: ModelHeader }
interface Ancestor {
  model: ModelWithHeader
}
interface ModelIndex {
  byDeclId: Map<string, ModelWithHeader>
  bySlug: Map<string, ModelWithHeader>
}

function buildMember(obj: ExtractedNode): Member {
  const { name, docs, examples } = parseTaggedComment(
    obj.comment,
    obj.type,
    obj.name,
  )
  return {
    name,
    docs,
    examples,
    code: removeComments(obj.node),
    signature: obj.signature,
  }
}

function generateStateModelDocs(files: string[]) {
  const cwd = `${process.cwd()}/`
  const byFile: Record<string, StateModel> = {}
  extractWithComment(files, (obj: ExtractedNode) => {
    const fn = obj.filename
    byFile[fn] ??= {
      properties: [],
      volatiles: [],
      getters: [],
      methods: [],
      actions: [],
      filename: fn.replace(cwd, ''),
    }
    const file = byFile[fn]
    const member = buildMember(obj)

    if (obj.type === 'stateModel') {
      if (file.header && member.name && member.name !== file.header.name) {
        throw new Error(
          `${file.filename}: #stateModel ${file.header.name} and ${member.name} share a file, and the page for one would overwrite the other. Move ${member.name} into its own file.`,
        )
      }
      file.header = {
        name: member.name,
        docs: stripComposedBlock(member.docs),
        examples: member.examples,
        id: slugify(member.name, { lower: true }),
        selfDeclId: obj.selfDeclId,
        composedOf: obj.composedOf ?? [],
      }
    } else if (obj.type === 'property') {
      file.properties.push(member)
    } else if (obj.type === 'volatile') {
      file.volatiles.push(member)
    } else if (obj.type === 'getter') {
      file.getters.push(member)
    } else if (obj.type === 'method') {
      file.methods.push(member)
    } else {
      file.actions.push(member)
    }
  })
  return byFile
}

// Walk the composition graph transitively, depth-first, deduping by id and
// guarding cycles. Resolves first by declId (robust to aliased imports), then
// falls back to slug matching on the human-readable name.
function collectAncestors(
  model: ModelWithHeader,
  index: ModelIndex,
  seen = new Set<string>(),
): Ancestor[] {
  const out: Ancestor[] = []
  for (const ref of model.header.composedOf) {
    const parent =
      (ref.declId ? index.byDeclId.get(ref.declId) : undefined) ??
      (ref.name
        ? index.bySlug.get(slugify(ref.name, { lower: true }))
        : undefined)
    if (parent && !seen.has(parent.header.id)) {
      seen.add(parent.header.id)
      out.push({ model: parent })
      out.push(...collectAncestors(parent, index, seen))
    }
  }
  return out
}

const MEMBER_KINDS = [
  { key: 'properties', kind: 'property', label: 'Properties' },
  { key: 'volatiles', kind: 'volatile', label: 'Volatiles' },
  { key: 'getters', kind: 'getter', label: 'Getters' },
  { key: 'methods', kind: 'method', label: 'Methods' },
  { key: 'actions', kind: 'action', label: 'Actions' },
] as const

// GitHub renders these pages, and it slugs `#### getter: fooBar` to
// `getter-foobar`
function memberAnchor(kind: string, name: string) {
  return `${kind}-${name.toLowerCase()}`
}

function pageLink(model: ModelWithHeader, anchor?: string) {
  return `./${model.header.name}.md${anchor ? `#${anchor}` : ''}`
}

// A member the model or a nearer ancestor redeclares is listed once, where it
// is most specific
function inheritedSection(model: ModelWithHeader, ancestors: Ancestor[]) {
  const seen = new Map(
    MEMBER_KINDS.map(({ key }) => [key, new Set(model[key].map(m => m.name))]),
  )
  const blocks = ancestors.flatMap(({ model: ancestor }) => {
    const lines = MEMBER_KINDS.flatMap(({ key, kind, label }) => {
      const names = seen.get(key)!
      const members = ancestor[key].filter(m => !names.has(m.name))
      for (const m of members) {
        names.add(m.name)
      }
      return members.length
        ? [
            `**${label}:** ${members
              .map(
                m =>
                  `[${m.name}](${pageLink(ancestor, memberAnchor(kind, m.name))})`,
              )
              .join(', ')}`,
          ]
        : []
    })
    return lines.length
      ? [
          section(
            `### From [${ancestor.header.name}](${pageLink(ancestor)})`,
            ...lines,
          ),
        ]
      : []
  })
  return blocks.length
    ? section(
        '## Inherited members',
        'This model composes the ones below. Each member links to its docs on the page that declares it.',
        ...blocks,
      )
    : ''
}

function memberSection(
  modelName: string,
  { kind, label }: (typeof MEMBER_KINDS)[number],
  members: Member[],
  renderBody: (m: Member) => string,
) {
  return members.length
    ? section(
        `### ${modelName} - ${label}`,
        ...members
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map(m =>
            section(
              `#### ${kind}: ${m.name}`,
              m.docs,
              renderBody(m),
              exampleSection(m.examples, '**Example:**'),
            ),
          ),
      )
    : ''
}

// A property or volatile reads best as the line that declares it:
// `stripDefault(types.number, 1)` says more than `IOptionalIType<ISimpleType<
// number>, [undefined]>`, and it does not change when @jbrowse/core does
const MEMBER_BODY: Record<
  (typeof MEMBER_KINDS)[number]['key'],
  (m: Member) => string
> = {
  properties: m => codeBlock(m.code),
  volatiles: m => codeBlock(m.code),
  getters: m => codeBlock(`${m.name}: ${m.signature}`),
  methods: m => codeBlock(`${m.name}: ${m.signature}`),
  actions: m => codeBlock(`${m.name}: ${m.signature}`),
}

function renderModel(model: ModelWithHeader, ancestors: Ancestor[]): string {
  const { header, filename } = model
  const sections = section(
    ...MEMBER_KINDS.map(k =>
      memberSection(header.name, k, model[k.key], MEMBER_BODY[k.key]),
    ),
  )

  return `---
id: ${header.id}
title: ${header.name}
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/${filename})
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

${section(exampleSection(header.examples), overviewSection(header.docs, inheritedSection(model, ancestors), sections))}
`
}

async function main() {
  const dir = 'apidocs'
  // extract before touching the output directory, so a parse failure leaves the
  // previously generated docs in place rather than deleting them
  const models = generateStateModelDocs(await getAllFiles())
  const withHeader = Object.values(models).filter((m): m is ModelWithHeader =>
    Boolean(m.header),
  )
  const index: ModelIndex = {
    byDeclId: new Map(
      withHeader
        .filter(m => m.header.selfDeclId)
        .map(m => [m.header.selfDeclId!, m] as const),
    ),
    bySlug: new Map(withHeader.map(m => [m.header.id, m] as const)),
  }
  fs.mkdirSync(dir, { recursive: true })
  // drop pages for models that no longer exist. CLAUDE.md is authored, not
  // generated, and lives here to be found by anyone editing these files
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.md') && file !== 'CLAUDE.md') {
      fs.rmSync(`${dir}/${file}`)
    }
  }
  for (const model of withHeader) {
    const ancestors = collectAncestors(model, index)
    fs.writeFileSync(
      `${dir}/${model.header.name}.md`,
      renderModel(model, ancestors),
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()

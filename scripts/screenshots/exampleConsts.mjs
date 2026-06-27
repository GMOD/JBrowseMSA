/**
 * Single place to read the demo-app example data. The example alignments/trees/
 * GFFs live as TS string constants in the examples package
 * (exampleData.ts is hand-authored, generatedData.ts is built by
 * scripts/examples-gen). The screenshot scripts run under plain node with no TS
 * loader, so we read those files as text and pull constants out by name rather
 * than importing or duplicating the (multi-KB) data.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const examplesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../packages/examples/src/examples',
)
const sources = ['exampleData.ts', 'generatedData.ts'].map(name =>
  fs.readFileSync(path.join(examplesDir, name), 'utf8'),
)

// Match either `export const NAME = \`…\`` (backtick) or `export const NAME =
// '…'` (single-quote) across both source files.
export function readConst(name) {
  for (const src of sources) {
    const backtick = src.match(
      new RegExp(`export const ${name} = \`([\\s\\S]*?)\``),
    )
    if (backtick) {
      return backtick[1]
    }
    const quoted = src.match(new RegExp(`export const ${name} =\\s*'([^']*)'`))
    if (quoted) {
      return quoted[1]
    }
  }
  throw new Error(
    `example constant '${name}' not found in exampleData.ts/generatedData.ts`,
  )
}

export function hasConst(name) {
  return sources.some(src => new RegExp(`export const ${name} = `).test(src))
}

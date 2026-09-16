/**
 * Read the example data the screenshot specs draw. The alignments, trees, GFFs
 * and layer JSON live as files in packages/examples/data (see
 * scripts/examples-gen/README.md), so a spec reads exactly what the examples
 * imports and what writeExampleData.mjs publishes through the app.
 */
import fs from 'node:fs'
import path from 'node:path'

import { examplesDataDir, repoRoot } from './lib.mjs'

const examplesSrc = path.join(repoRoot, 'packages/examples/src/examples')

export const readData = file =>
  fs.readFileSync(path.join(examplesDataDir, file), 'utf8')

export const hasData = file => fs.existsSync(path.join(examplesDataDir, file))

// Layer data the examples import as JSON -- arc pairs, per-residue counts, the
// residue mappings they were derived through. The specs read the same file, so
// a regenerated layer reaches the figure and the live example together.
export const readJson = file =>
  JSON.parse(fs.readFileSync(path.join(examplesSrc, file), 'utf8'))

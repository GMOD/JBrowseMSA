/**
 * Publish the examples package's data files through the demo app, so a
 * `?data=` deep link can point a `msaFilehandle` / `treeFilehandle` /
 * `gffFilehandle` at a hosted file instead of carrying the whole alignment in
 * the query string (the lysine Stockholm alone is ~26 KB).
 *
 * Every file in packages/examples/data is copied verbatim into
 * packages/app/public/data, which the app serves at its root and gmod.org
 * serves at /JBrowseMSA/demo/data/, so a link fetches the same bytes the
 * live examples import.
 *
 * Run standalone with:  node scripts/screenshots/writeExampleData.mjs
 * (also runs automatically as the first step of `pnpm screenshots`).
 */
import fs from 'node:fs'
import path from 'node:path'

import { appDataDir, examplesDataDir, repoRoot } from './lib.mjs'

// Unaligned FASTA -> an equal-width block, by padding every sequence on the
// right with gaps. Right-padding adds no internal gaps, so residue N stays in
// column N for every row.
function rightPadToBlock(fasta) {
  const records = fasta
    .split('>')
    .slice(1)
    .map(block => {
      const [header, ...rest] = block.split('\n')
      return { header: header.trim(), seq: rest.join('').replace(/\s/g, '') }
    })
  const width = Math.max(...records.map(r => r.seq.length))
  return `${records
    .map(r => `>${r.header}\n${r.seq.padEnd(width, '-')}`)
    .join('\n')}\n`
}

fs.mkdirSync(appDataDir, { recursive: true })
let copied = 0
for (const file of fs.readdirSync(examplesDataDir).sort()) {
  fs.copyFileSync(path.join(examplesDataDir, file), path.join(appDataDir, file))
  copied++
}
console.log(`copied ${copied} files from packages/examples/data`)

// The twelve NLRP1 sequences unaligned: the aligner's committed input, padded
// to a common length. Column N is residue N, so the same domain GFF draws each
// protein's domains on its own residue ruler, as a domain cartoon does, with
// the component and palette of the aligned figure (docs/media/column-lock.png).
const unaligned = 'nlrp1-unaligned.aln'
fs.writeFileSync(
  path.join(appDataDir, unaligned),
  rightPadToBlock(
    fs.readFileSync(
      path.join(repoRoot, 'scripts/examples-gen/datasets/nlrp1.fasta'),
      'utf8',
    ),
  ),
)
console.log(`wrote data/${unaligned}`)

/**
 * Publish the examples package's data files through the demo app, so a
 * `?data=` deep link can point a `msaFilehandle` / `treeFilehandle` /
 * `gffFilehandle` at a hosted file instead of carrying the whole alignment in
 * the query string (the lysine Stockholm alone is ~26 KB).
 *
 * Every file in packages/examples/data is copied verbatim into
 * packages/app/public/data, which the app serves at its root and gmod.org
 * serves at /JBrowseMSA/demo/data/. The examples package is the single source:
 * the same bytes the gallery imports are the bytes a link fetches.
 *
 * Run standalone with:  node scripts/screenshots/writeExampleData.mjs
 * (also runs automatically as the first step of `pnpm screenshots`).
 */
import fs from 'node:fs'
import path from 'node:path'

import { appDataDir, examplesDataDir, repoRoot } from './lib.mjs'

// Unaligned FASTA -> an equal-width block, by padding every sequence on the
// RIGHT with gaps. Right-padding is the point: it adds no internal gaps, so
// residue N stays in column N for every row, which is what makes the block a
// residue ruler rather than an alignment.
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

// The same twelve NLRP1 sequences NOT aligned -- the aligner's own committed
// input, padded to a common length. With no gaps inserted, column N is residue
// N, so loading it with the same domain GFF draws each protein's domains on its
// own residue ruler: the standard domain-cartoon view, from the same component
// and palette as the aligned one. That makes the pair a controlled comparison,
// one input aligned and one not, everything else identical
// (docs/media/column-lock.png).
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

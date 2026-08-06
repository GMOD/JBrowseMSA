/**
 * Write the larger real-data examples out as standalone files the demo app can
 * fetch, instead of inlining them into a `?data=` URL. A loaded-state deep-link
 * otherwise has to carry the whole alignment in the query string (the lysine
 * Stockholm alone is ~26 KB); pointing a *Filehandle prop at a hosted file keeps
 * those links a few hundred bytes.
 *
 * Single source of truth is the examples package's TS constants — this reads the
 * file and pulls the constants out by name (no TS loader needed), so the hosted
 * files never drift from the in-app examples. Output is served from the app
 * (packages/app/public -> dist root -> gmod.org/JBrowseMSA/demo/data/...).
 *
 * Run standalone with:  node scripts/screenshots/writeExampleData.mjs
 * (also runs automatically as the first step of `pnpm screenshots`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { readConst } from './exampleConsts.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const outDir = path.join(repoRoot, 'packages/app/public/data')

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

// format is detected from content (CLUSTAL/# STOCKHOLM/>/##gff headers), so the
// extensions here are only for human readability
const files = {
  'kinase.aln': readConst('kinaseMSA'),
  'kinase.nh': readConst('kinaseTree'),
  'kinase-domains.gff': readConst('kinaseDomainsGFF'),
  'nlrp1.aln': readConst('nlrp1MSA'),
  'nlrp1.nh': readConst('nlrp1Tree'),
  'nlrp1-domains.gff': readConst('nlrp1DomainsGFF'),
  // The same twelve sequences NOT aligned — each one padded on the right to a
  // common length so the viewer accepts it as a block. With no gaps inserted,
  // column N *is* residue N, so loading it with the same domain GFF draws each
  // protein's domains on its own residue ruler: the standard domain-cartoon
  // view, produced by the same component and palette as the aligned one.
  // That makes the pair a controlled comparison — one input aligned, one not,
  // everything else identical (docs/media/column-lock.png).
  //
  // Read from the examples-gen dataset rather than a generated constant: this
  // is the aligner's own committed INPUT, so the unaligned panel is guaranteed
  // to be the same sequences the aligned panel was built from, and the examples
  // package doesn't carry a constant that only a screenshot uses.
  'nlrp1-unaligned.aln': rightPadToBlock(
    fs.readFileSync(
      path.join(repoRoot, 'scripts/examples-gen/datasets/nlrp1.fasta'),
      'utf8',
    ),
  ),
  'lysine.stock': readConst('lysineMSA'),
  'f12-cetacean-cds.stock': readConst('f12CdsMSA'),
  'f12-cetacean-exons.gff': readConst('f12ExonsGFF'),
}

fs.mkdirSync(outDir, { recursive: true })
for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, file), content)
  console.log(`wrote data/${file} (${content.length} bytes)`)
}

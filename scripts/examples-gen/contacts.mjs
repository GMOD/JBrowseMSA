/**
 * Residue contacts for the Src-family kinase example, derived from a solved
 * structure and written as arc-track data.
 *
 * The domain overlay already draws SH3, SH2 and the kinase domain as three
 * boxes per row. What it cannot draw is how they pack against each other, which
 * is the whole mechanism: autoinhibited Src folds its C-terminal tail back so
 * phospho-Tyr527 binds its own SH2 domain, clamping the kinase shut. That is a
 * pair of positions, so it is an arc.
 *
 * Steps, all against public data (the first three live in structure.mjs):
 *   1. mmCIF for 2SRC (autoinhibited human Src) from RCSB.
 *   2. The SIFTS residue mapping from PDBe, so structure numbering becomes
 *      UniProt numbering -- which is what the alignment rows and the domain
 *      GFF already use, so the arcs land without a second alignment step.
 *   3. The check that the row uses that numbering too.
 *   4. Cbeta-Cbeta contacts under 8 A (Calpha for glycine), keeping only pairs
 *      whose ends sit in *different* annotated regions. Every structure has
 *      thousands of contacts and nearly all of them are a residue touching its
 *      own neighbours; the inter-domain ones are the architecture.
 *
 * Writes packages/examples/src/examples/kinaseStructure.json: the contacts, and
 * the residue mapping they were derived through (see docs/layers.md), which is
 * the same SIFTS correspondence written down instead of consumed and discarded.
 * Data, not a TS module, so the formatter has nothing to rewrite and the
 * screenshot specs read the same file the example imports. Run it when the
 * structure or the domain boundaries change:
 *
 *   node scripts/examples-gen/contacts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  checkRowNumbering,
  dataDir,
  fetchSifts,
  fetchStructure,
  observedResidues,
  readRow,
  residueMapping,
  residuePoints,
  sequenceToUniprot,
  writeJson,
} from './structure.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.resolve(
  here,
  '../../packages/examples/src/examples/kinaseStructure.json',
)

const PDB = '2src'
const CHAIN = 'A'
const ACCESSION = 'P12931' // SRC_HUMAN, the alignment's reference row
const ROW = 'SRC_HUMAN'
const CUTOFF = 8

// The regions come from the committed domain GFF the example already draws, so
// the arcs and the boxes can never disagree about where a domain ends. The tail
// is what follows the last of them.
function readRegions() {
  const gff = fs.readFileSync(path.join(dataDir, 'kinase-domains.gff'), 'utf8')
  const regions = []
  for (const line of gff.split('\n')) {
    const f = line.split('\t')
    if (f[0] !== ROW || f.length < 9) {
      continue
    }
    const name = /signature_desc=([^;]*)/.exec(f[8])?.[1] ?? 'domain'
    regions.push({
      name: decodeURIComponent(name)
        .replace(/_domain$/, '')
        .replace('Protein tyrosine and serine/threonine kinase', 'kinase'),
      start: Number(f[3]),
      end: Number(f[4]),
    })
  }
  regions.sort((a, b) => a.start - b.start)
  return regions
}

const atoms = await fetchStructure(PDB)
const mappings = await fetchSifts(PDB, ACCESSION)
const points = residuePoints(atoms, CHAIN)
const toUniprot = sequenceToUniprot(mappings, CHAIN)
const rowSeq = readRow('kinase.aln', ROW)
checkRowNumbering({ points, toUniprot, seq: rowSeq, row: ROW, pdb: PDB })

const mapping = residueMapping({
  mappings,
  chain: CHAIN,
  observed: observedResidues(atoms, CHAIN),
  row: ROW,
  accession: ACCESSION,
  pdb: PDB,
  rowLength: rowSeq.length,
})

const regions = readRegions()
const lastDomainEnd = Math.max(...regions.map(r => r.end))
const regionOf = pos => {
  const hit = regions.find(r => pos >= r.start && pos <= r.end)
  return hit ? hit.name : pos > lastDomainEnd ? 'C-terminal tail' : undefined
}

const residues = [...points.keys()]
  .map(seqId => ({ seqId, pos: toUniprot(seqId) }))
  .filter(r => r.pos !== undefined)
  .sort((a, b) => a.pos - b.pos)

const contacts = []
for (let i = 0; i < residues.length; i++) {
  for (let j = i + 1; j < residues.length; j++) {
    const a = residues[i]
    const b = residues[j]
    const ra = regionOf(a.pos)
    const rb = regionOf(b.pos)
    if (!ra || !rb || ra === rb) {
      continue
    }
    const [ax, ay, az] = points.get(a.seqId).xyz
    const [bx, by, bz] = points.get(b.seqId).xyz
    const d = Math.hypot(ax - bx, ay - by, az - bz)
    if (d < CUTOFF) {
      contacts.push({ start: a.pos, end: b.pos, pair: `${ra} - ${rb}` })
    }
  }
}

const byPair = new Map()
for (const c of contacts) {
  byPair.set(c.pair, (byPair.get(c.pair) ?? 0) + 1)
}
const summary = [...byPair].sort((a, b) => b[1] - a[1])

writeJson(outFile, {
  generatedBy: 'scripts/examples-gen/contacts.mjs',
  description:
    `Inter-domain residue contacts of autoinhibited human Src: every ` +
    `C-beta pair under ${CUTOFF} A whose two residues sit in different ` +
    `annotated regions of the ${ROW} row. A residue touching its own ` +
    `neighbours says nothing about how the domains pack, and that is ` +
    `nearly every contact in the structure.`,
  pdb: PDB.toUpperCase(),
  chain: CHAIN,
  accession: ACCESSION,
  row: ROW,
  cutoffAngstroms: CUTOFF,
  counts: Object.fromEntries(summary),
  residueMappings: [mapping],
  contacts,
})
console.log(
  `mapping: row ${mapping.segments[0].rowStart}-${mapping.segments.at(-1).rowEnd} ` +
    `of a ${mapping.rowLength}-residue row, ${mapping.segments.length} segment(s), ` +
    `${(mapping.unobserved ?? []).length} unobserved range(s)`,
)
console.log(
  `${contacts.length} inter-domain contacts from ${PDB.toUpperCase()}:\n${summary
    .map(([pair, n]) => `  ${pair}: ${n}`)
    .join('\n')}`,
)

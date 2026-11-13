/**
 * Residue contacts for the Src-family kinase example, derived from a solved
 * structure and written as arc-track data.
 *
 * The domain overlay draws SH3, SH2 and the kinase domain as three boxes per
 * row, and the arcs mark how they pack. In autoinhibited Src the C-terminal
 * tail folds back so phospho-Tyr527 binds the protein's own SH2 domain, and the
 * linker between SH2 and the kinase domain binds SH3.
 *
 * Steps, all against public data (the first three live in structure.mjs):
 *   1. mmCIF for 2SRC (autoinhibited human Src) from RCSB.
 *   2. The SIFTS residue mapping from PDBe, converting structure numbering to
 *      the UniProt numbering the alignment rows and the domain GFF use, so the
 *      arcs need no second alignment step.
 *   3. The check that the row uses that numbering too.
 *   4. Cbeta-Cbeta contacts under 8 A (Calpha for glycine). The sequence splits
 *      into the GFF's domains and the stretches between them, and a pair is
 *      kept when at least one other region lies between its two ends' regions.
 *      A structure has thousands of contacts, nearly all between neighbouring
 *      residues or neighbouring regions.
 *
 * Writes packages/examples/src/examples/kinaseStructure.json: the contacts, and
 * the SIFTS residue mapping they were derived through (see docs/layers.md). The
 * output is JSON so the formatter leaves it alone and the screenshot specs read
 * the same file the example imports. Run it when the structure or the domain
 * boundaries change:
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
  residueContacts,
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

// The regions come from the committed domain GFF the example draws, so arcs and
// boxes use the same domain ends. The tail is everything after the last domain.
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

// The domains of the GFF and the stretches between them, in sequence order.
// The SH2-kinase linker holds no domain and packs against SH3 in the
// autoinhibited form, so it needs a region of its own.
function segments(regions) {
  const named = regions.map(r => ({
    ...r,
    name: r.name.replace(/ domain$/, ''),
  }))
  return named.flatMap((r, i) => {
    const prev = named[i - 1]
    const gap = prev
      ? {
          name: `${prev.name}-${r.name} linker`,
          start: prev.end + 1,
          end: r.start - 1,
        }
      : { name: 'N-terminal region', start: 1, end: r.start - 1 }
    const tail =
      i === named.length - 1
        ? [{ name: 'C-terminal tail', start: r.end + 1, end: Infinity }]
        : []
    return [...(gap.start <= gap.end ? [gap] : []), r, ...tail]
  })
}

// A pair joining two neighbouring segments, such as SH2 and the linker that
// follows it, is the chain continuing. A pair between segments with another
// one between them in sequence marks how the domains pack.
const parts = segments(readRegions())
const segmentOf = pos => parts.findIndex(p => pos >= p.start && pos <= p.end)

const contacts = residueContacts({ points, toUniprot, cutoff: CUTOFF })
  .map(({ start, end }) => ({
    start,
    end,
    a: segmentOf(start),
    b: segmentOf(end),
  }))
  .filter(({ a, b }) => b - a >= 2)
  .map(({ start, end, a, b }) => ({
    start,
    end,
    pair: `${parts[a].name} - ${parts[b].name}`,
  }))

const byPair = new Map()
for (const c of contacts) {
  byPair.set(c.pair, (byPair.get(c.pair) ?? 0) + 1)
}
const summary = [...byPair].toSorted((a, b) => b[1] - a[1])

writeJson(outFile, {
  generatedBy: 'scripts/examples-gen/contacts.mjs',
  description:
    `Residue contacts between regions of autoinhibited human Src: every ` +
    `C-beta pair under ${CUTOFF} A whose two residues sit in regions of the ` +
    `${ROW} row with at least one other region between them. The regions ` +
    `are the domains of the GFF and the linkers between them.`,
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

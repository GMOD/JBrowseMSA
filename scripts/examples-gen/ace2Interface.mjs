/**
 * The ACE2 residues SARS-CoV-2 spike actually touches, as highlights over the
 * ortholog alignment.
 *
 * The ACE2 example says host range is decided by a handful of contact residues
 * and then leaves the reader to find them among 800 columns of dots. These are
 * those residues, taken from the structure of the complex rather than from a
 * list retyped out of a paper: every ACE2 residue in PDB 6M0J with a heavy atom
 * within 4 A of a heavy atom of the spike receptor-binding domain.
 *
 * Steps:
 *   1. mmCIF for 6M0J (spike RBD + human ACE2) from RCSB.
 *   2. All-atom distances between chain A (ACE2) and chain E (the RBD).
 *   3. SIFTS, so the contacts land on the row's own numbering, checked residue
 *      by residue against the Human row of the alignment.
 *
 * Writes packages/examples/src/examples/ace2Interface.json: the contact
 * residues, the contiguous runs they form as `highlights`, and the SIFTS
 * mapping they were derived through (see docs/layers.md).
 *
 *   node scripts/examples-gen/ace2Interface.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  THREE_TO_ONE,
  checkRowNumbering,
  fetchSifts,
  fetchStructure,
  observedResidues,
  readRow,
  residueAtoms,
  residueMapping,
  residuePoints,
  sequenceToUniprot,
  writeJson,
} from './structure.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.resolve(
  here,
  '../../packages/examples/src/examples/ace2Interface.json',
)

const PDB = '6m0j'
const ACE2_CHAIN = 'A'
const RBD_CHAIN = 'E'
const ACCESSION = 'Q9BYF1' // ACE2_HUMAN, the alignment's reference row
const ROW = 'Human'
const MSA = 'ace2.aln'
// The usual interface cutoff: two heavy atoms within 4 A are in contact. C-beta
// distance would be the wrong measure here, since two long side chains reach
// each other from much further apart than their C-betas are.
const CUTOFF = 4

function minDistance(a, b) {
  let best = Infinity
  for (const [ax, ay, az] of a) {
    for (const [bx, by, bz] of b) {
      const d = Math.hypot(ax - bx, ay - by, az - bz)
      if (d < best) {
        best = d
      }
    }
  }
  return best
}

const atoms = await fetchStructure(PDB)
const sifts = await fetchSifts(PDB, ACCESSION)
const toUniprot = sequenceToUniprot(sifts, ACE2_CHAIN)
const seq = readRow(MSA, ROW)
checkRowNumbering({
  points: residuePoints(atoms, ACE2_CHAIN),
  toUniprot,
  seq,
  row: ROW,
  pdb: PDB,
})

const ace2 = residueAtoms(atoms, ACE2_CHAIN)
const rbd = [...residueAtoms(atoms, RBD_CHAIN).values()]
const contacts = []
for (const [seqId, residue] of ace2) {
  const pos = toUniprot(seqId)
  if (pos === undefined) {
    continue
  }
  let closest = Infinity
  let partners = 0
  for (const other of rbd) {
    const d = minDistance(residue.xyz, other.xyz)
    if (d < CUTOFF) {
      partners++
      closest = Math.min(closest, d)
    }
  }
  if (partners) {
    contacts.push({
      seqPos: pos,
      residue: THREE_TO_ONE[residue.comp] ?? 'X',
      minDistance: Number(closest.toFixed(2)),
      rbdResidues: partners,
    })
  }
}
contacts.sort((a, b) => a.seqPos - b.seqPos)

for (const contact of contacts) {
  if (seq[contact.seqPos - 1] !== contact.residue) {
    throw new Error(
      `contact ${contact.seqPos} is ${contact.residue} in ${PDB} and ` +
        `${seq[contact.seqPos - 1]} in the ${ROW} row`,
    )
  }
}

// Neighbouring contacts become one band. Drawing 20 single-residue bands on an
// 800-column alignment gives 20 labels fighting over the same few pixels; the
// runs are what the eye can actually read, and the per-residue list is still in
// this file for anything that wants it.
const highlights = []
for (const { seqPos } of contacts) {
  const last = highlights.at(-1)
  if (last && seqPos <= last.end + 1) {
    last.end = seqPos
  } else {
    highlights.push({ row: ROW, start: seqPos, end: seqPos })
  }
}

writeJson(outFile, {
  generatedBy: 'scripts/examples-gen/ace2Interface.mjs',
  description:
    `ACE2 residues that contact the SARS-CoV-2 spike receptor-binding ` +
    `domain: every residue of chain ${ACE2_CHAIN} in ${PDB.toUpperCase()} ` +
    `with a heavy atom within ${CUTOFF} A of a heavy atom of chain ` +
    `${RBD_CHAIN}. Positions are residues of the ${ROW} row, which is ` +
    `${ACCESSION} numbering, so the viewer projects them through the ` +
    `alignment's gaps onto every ortholog.`,
  source: `https://www.rcsb.org/structure/${PDB.toUpperCase()}`,
  retrieved: new Date().toISOString().slice(0, 10),
  pdb: PDB.toUpperCase(),
  chains: { ace2: ACE2_CHAIN, spikeRbd: RBD_CHAIN },
  accession: ACCESSION,
  row: ROW,
  cutoffAngstroms: CUTOFF,
  contacts,
  highlights,
  residueMappings: [
    residueMapping({
      mappings: sifts,
      chain: ACE2_CHAIN,
      observed: observedResidues(atoms, ACE2_CHAIN),
      row: ROW,
      accession: ACCESSION,
      pdb: PDB,
      rowLength: seq.length,
    }),
  ],
})

console.log(
  `${contacts.length} contact residues in ${highlights.length} run(s): ` +
    contacts.map(c => `${c.residue}${c.seqPos}`).join(' '),
)

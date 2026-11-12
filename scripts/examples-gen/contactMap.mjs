/**
 * The full residue contact map of one chain of a PDB entry, in the UniProt
 * numbering of an alignment row, for a script in another language to score a
 * prediction against. kinaseEsmContacts.py runs it.
 *
 *   node scripts/examples-gen/contactMap.mjs <pdb> <chain> <accession> \
 *     <alignment file in packages/examples/data> <row> <cutoff> <out.json>
 *
 * Writes `{pdb, chain, accession, row, cutoffAngstroms, observed, contacts}`:
 * `observed` lists the row positions the structure resolves, and `contacts`
 * every pair of them whose C-beta atoms (C-alpha for glycine) sit under the
 * cutoff, as `[start, end]`.
 */
import fs from 'node:fs'

import {
  checkRowNumbering,
  fetchSifts,
  fetchStructure,
  readRow,
  residueContacts,
  residuePoints,
  sequenceToUniprot,
} from './structure.mjs'

const [pdb, chain, accession, alignment, row, cutoff, outFile] =
  process.argv.slice(2)
if (!outFile) {
  throw new Error(
    'usage: contactMap.mjs <pdb> <chain> <accession> <alignment> <row> <cutoff> <out.json>',
  )
}

const atoms = await fetchStructure(pdb)
const mappings = await fetchSifts(pdb, accession)
const points = residuePoints(atoms, chain)
const toUniprot = sequenceToUniprot(mappings, chain)
checkRowNumbering({
  points,
  toUniprot,
  seq: readRow(alignment, row),
  row,
  pdb,
})

const observed = [...points.keys()]
  .map(toUniprot)
  .filter(pos => pos !== undefined)
  .toSorted((a, b) => a - b)
const contacts = residueContacts({
  points,
  toUniprot,
  cutoff: Number(cutoff),
}).map(({ start, end }) => [start, end])

fs.writeFileSync(
  outFile,
  JSON.stringify({
    pdb: pdb.toUpperCase(),
    chain,
    accession,
    row,
    cutoffAngstroms: Number(cutoff),
    observed,
    contacts,
  }),
)
console.log(
  `${contacts.length} contacts among ${observed.length} residues of ${pdb.toUpperCase()}`,
)

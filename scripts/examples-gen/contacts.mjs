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
 * Steps, all against public data:
 *   1. mmCIF for 2SRC (autoinhibited human Src) from RCSB.
 *   2. The SIFTS residue mapping from PDBe, so structure numbering becomes
 *      UniProt numbering -- which is what the alignment rows and the domain
 *      GFF already use, so the arcs land without a second alignment step.
 *   3. Cbeta-Cbeta contacts under 8 A (Calpha for glycine), keeping only pairs
 *      whose ends sit in *different* annotated regions. Every structure has
 *      thousands of contacts and nearly all of them are a residue touching its
 *      own neighbours; the inter-domain ones are the architecture.
 *
 * Writes packages/examples/src/examples/kinaseContacts.json -- data, not a TS
 * module, so the formatter has nothing to rewrite and the screenshot specs read
 * the same file the example imports. Run it when the structure or the domain
 * boundaries change:
 *
 *   node scripts/examples-gen/contacts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const exampleData = path.resolve(
  here,
  '../../packages/examples/src/examples/exampleData.ts',
)
const outFile = path.resolve(
  here,
  '../../packages/examples/src/examples/kinaseContacts.json',
)

const PDB = '2src'
const CHAIN = 'A'
const ACCESSION = 'P12931' // SRC_HUMAN, the alignment's reference row
const ROW = 'SRC_HUMAN'
const CUTOFF = 8

// mmCIF values are whitespace-separated, except that a value containing spaces
// is single-quoted. atom_site rarely needs it, but a naive split silently
// shifts every later column of that row when it does.
function tokenize(line) {
  return [...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
    m => m[1] ?? m[2] ?? m[3],
  )
}

function parseAtomSite(cif) {
  const tags = []
  const rows = []
  let inLoop = false
  for (const line of cif.split('\n')) {
    if (line.startsWith('_atom_site.')) {
      tags.push(line.trim().slice('_atom_site.'.length))
      inLoop = true
    } else if (inLoop) {
      if (line.startsWith('#')) {
        break
      }
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        rows.push(
          Object.fromEntries(tokenize(line).map((v, i) => [tags[i], v])),
        )
      }
    }
  }
  return rows
}

// One point per residue: Cbeta, or Calpha for glycine, which has none. HETATM
// rows count when they carry a label_seq_id -- a modified residue in the chain
// (2SRC's phospho-tyrosine 527 is exactly that, and it is the residue the whole
// example is about).
function residuePoints(atoms) {
  const points = new Map()
  for (const a of atoms) {
    if (a.auth_asym_id !== CHAIN) {
      continue
    }
    if (a.label_alt_id !== '.' && a.label_alt_id !== 'A') {
      continue
    }
    if (a.pdbx_PDB_model_num && a.pdbx_PDB_model_num !== '1') {
      continue
    }
    const seqId = Number(a.label_seq_id)
    if (!Number.isFinite(seqId)) {
      continue
    }
    const isGly = a.label_comp_id === 'GLY'
    if (a.label_atom_id !== (isGly ? 'CA' : 'CB')) {
      continue
    }
    points.set(seqId, {
      comp: a.label_comp_id,
      xyz: [Number(a.Cartn_x), Number(a.Cartn_y), Number(a.Cartn_z)],
    })
  }
  return points
}

// prettier-ignore
const THREE_TO_ONE = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E',
  GLY: 'G', HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F',
  PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
  // modified residues that are still the residue they were made from, which is
  // how the row spells them. PTR is the one this example turns on
  PTR: 'Y', SEP: 'S', TPO: 'T', MSE: 'M',
}

/**
 * The whole point of a contact map on an alignment is that the arcs land on the
 * residues they came from, and three coordinate systems have to agree for that:
 * the structure's, UniProt's, and the alignment row's. SIFTS settles the first
 * two. The third is an assumption -- that this row's residue n IS UniProt's
 * residue n -- which holds for a full-length sequence and fails silently for a
 * fragment row, the `/27-137` case a domain alignment is full of. It fails in
 * the direction that looks like it worked, so check it against what the
 * structure actually contains rather than trusting it.
 */
function checkRowNumbering(points, toUniprot, row) {
  const seq = readRow(row)
  let checked = 0
  const mismatches = []
  for (const [seqId, { comp }] of points) {
    const pos = toUniprot(seqId)
    const expected = THREE_TO_ONE[comp]
    if (pos === undefined || !expected) {
      continue
    }
    checked++
    const actual = seq[pos - 1]
    if (actual !== expected) {
      mismatches.push(
        `${pos}: row has ${actual ?? '(past the end)'}, ${PDB.toUpperCase()} has ${comp}`,
      )
    }
  }
  if (!checked) {
    throw new Error(
      `no residue of ${row} could be checked against the structure`,
    )
  }
  if (mismatches.length) {
    throw new Error(
      `${mismatches.length}/${checked} residues disagree between ${row} and ` +
        `${ACCESSION} numbering, so the contacts would be drawn in the wrong ` +
        `places. Is that row a fragment rather than the full-length sequence?\n  ` +
        mismatches.slice(0, 5).join('\n  '),
    )
  }
  console.log(`${checked} residues of ${row} match ${PDB.toUpperCase()}`)
}

// the alignment row, ungapped, straight out of the committed constant
function readRow(row) {
  const msa = /export const kinaseMSA = `(.*?)`/s.exec(
    fs.readFileSync(exampleData, 'utf8'),
  )?.[1]
  if (!msa) {
    throw new Error('kinaseMSA not found in exampleData.ts')
  }
  const seq = msa
    .split('\n')
    .filter(line => line.startsWith(`${row} `) || line.startsWith(`${row}\t`))
    .map(line => line.slice(row.length).trim())
    .join('')
    .replaceAll('-', '')
  if (!seq) {
    throw new Error(`row ${row} not found in kinaseMSA`)
  }
  return seq
}

// SIFTS gives the mapping as blocks; within one block structure numbering and
// UniProt numbering differ by a constant, so a block is (offset, range).
function sequenceToUniprot(mappings) {
  const blocks = mappings
    .filter(m => m.chain_id === CHAIN)
    .map(m => ({
      from: m.start.residue_number,
      to: m.end.residue_number,
      offset: m.unp_start - m.start.residue_number,
    }))
  return seqId => {
    const block = blocks.find(b => seqId >= b.from && seqId <= b.to)
    return block ? seqId + block.offset : undefined
  }
}

// The regions come from the committed domain GFF the example already draws, so
// the arcs and the boxes can never disagree about where a domain ends. The tail
// is what follows the last of them.
function readRegions() {
  const gff = /export const kinaseDomainsGFF = `(.*?)`/s.exec(
    fs.readFileSync(exampleData, 'utf8'),
  )?.[1]
  if (!gff) {
    throw new Error('kinaseDomainsGFF not found in exampleData.ts')
  }
  const regions = []
  for (const line of gff.split('\n')) {
    const f = line.split('\t')
    if (f[0] !== ROW || f.length < 9) {
      continue
    }
    const name = /signature_desc=([^;]*)/.exec(f[8])?.[1] ?? 'domain'
    regions.push({
      name: decodeURIComponent(name).replace(/_domain$/, ''),
      start: Number(f[3]),
      end: Number(f[4]),
    })
  }
  regions.sort((a, b) => a.start - b.start)
  return regions
}

const cif = await (
  await fetch(`https://files.rcsb.org/download/${PDB.toUpperCase()}.cif`)
).text()
const sifts = await (
  await fetch(`https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${PDB}`)
).json()
const mappings = sifts[PDB]?.UniProt?.[ACCESSION]?.mappings
if (!mappings) {
  throw new Error(`${PDB} carries no SIFTS mapping to ${ACCESSION}`)
}

const points = residuePoints(parseAtomSite(cif))
const toUniprot = sequenceToUniprot(mappings)
checkRowNumbering(points, toUniprot, ROW)
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

fs.writeFileSync(
  outFile,
  `${JSON.stringify(
    {
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
      contacts,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `${contacts.length} inter-domain contacts from ${PDB.toUpperCase()}:\n${summary
    .map(([pair, n]) => `  ${pair}: ${n}`)
    .join('\n')}`,
)
console.log(`wrote ${outFile}`)

/**
 * The structure half of the example pipeline: mmCIF coordinates from RCSB, the
 * SIFTS residue mapping from PDBe, and the checks that keep three coordinate
 * systems -- the structure's, UniProt's and the alignment row's -- from being
 * confused for each other.
 *
 * contacts.mjs (Src), hemoglobin.mjs (sickle-cell) and ace2Interface.mjs (the
 * spike contacts) all derive different things from the same three steps, so the
 * steps live here and each script keeps only what is specific to it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const dataDir = path.resolve(here, '../../packages/examples/data')

export const structureUrl = pdb =>
  `https://files.rcsb.org/download/${pdb.toUpperCase()}.cif`

// prettier-ignore
export const THREE_TO_ONE = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E',
  GLY: 'G', HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F',
  PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
  // modified residues that are still the residue they were made from, which is
  // how an alignment row spells them
  PTR: 'Y', SEP: 'S', TPO: 'T', MSE: 'M',
}

// mmCIF values are whitespace-separated, except that a value containing spaces
// is single-quoted. atom_site rarely needs it, but a naive split silently
// shifts every later column of that row when it does.
function tokenize(line) {
  return [...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
    m => m[1] ?? m[2] ?? m[3],
  )
}

export function parseAtomSite(cif) {
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

export async function fetchStructure(pdb) {
  const res = await fetch(structureUrl(pdb))
  if (!res.ok) {
    throw new Error(`${pdb}: mmCIF fetch failed (${res.status})`)
  }
  return parseAtomSite(await res.text())
}

export async function fetchSifts(pdb, accession) {
  const res = await fetch(
    `https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${pdb.toLowerCase()}`,
  )
  if (!res.ok) {
    throw new Error(`${pdb}: SIFTS fetch failed (${res.status})`)
  }
  const body = await res.json()
  const mappings = body[pdb.toLowerCase()]?.UniProt?.[accession]?.mappings
  if (!mappings) {
    throw new Error(`${pdb} carries no SIFTS mapping to ${accession}`)
  }
  return mappings
}

const usable = (atom, chain) =>
  atom.auth_asym_id === chain &&
  (atom.label_alt_id === '.' || atom.label_alt_id === 'A') &&
  (!atom.pdbx_PDB_model_num || atom.pdbx_PDB_model_num === '1')

// One point per residue: C-beta, or C-alpha for glycine, which has none. HETATM
// rows count when they carry a label_seq_id -- a modified residue in the chain
// (2SRC's phospho-tyrosine 527 is exactly that).
export function residuePoints(atoms, chain) {
  const points = new Map()
  for (const a of atoms) {
    if (!usable(a, chain)) {
      continue
    }
    const seqId = Number(a.label_seq_id)
    const isGly = a.label_comp_id === 'GLY'
    if (!Number.isFinite(seqId) || a.label_atom_id !== (isGly ? 'CA' : 'CB')) {
      continue
    }
    points.set(seqId, {
      comp: a.label_comp_id,
      xyz: [Number(a.Cartn_x), Number(a.Cartn_y), Number(a.Cartn_z)],
    })
  }
  return points
}

// Every atom of every residue of a chain, which is what an interface needs: two
// side chains touch through whichever atoms happen to face each other, and a
// C-beta cutoff wide enough to catch that also catches residues that only pass
// nearby.
export function residueAtoms(atoms, chain) {
  const residues = new Map()
  for (const a of atoms) {
    if (!usable(a, chain) || a.type_symbol === 'H') {
      continue
    }
    const seqId = Number(a.label_seq_id)
    if (!Number.isFinite(seqId)) {
      continue
    }
    let residue = residues.get(seqId)
    if (!residue) {
      residue = { comp: a.label_comp_id, xyz: [] }
      residues.set(seqId, residue)
    }
    residue.xyz.push([Number(a.Cartn_x), Number(a.Cartn_y), Number(a.Cartn_z)])
  }
  return residues
}

// Every residue the structure resolved, by label_seq_id. A residue can have a
// backbone and no side chain, so this is wider than the C-beta points -- and it
// is the set that answers "was this observed", which a mapping has to state
// rather than imply.
export function observedResidues(atoms, chain) {
  const observed = new Set()
  for (const a of atoms) {
    if (a.auth_asym_id !== chain) {
      continue
    }
    const seqId = Number(a.label_seq_id)
    if (Number.isFinite(seqId)) {
      observed.add(seqId)
    }
  }
  return observed
}

// SIFTS gives the mapping as blocks; within one block structure numbering and
// UniProt numbering differ by a constant, so a block is (offset, range).
export function sequenceToUniprot(mappings, chain) {
  const blocks = mappings
    .filter(m => m.chain_id === chain)
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

/**
 * The SIFTS correspondence written down as a `residueMappings` entry (see
 * docs/layers.md). It is the data every derivation here goes through; keeping
 * only the derived arcs or highlights would throw away the part the next
 * consumer needs, and re-deriving it from a live SIFTS call at view time is
 * what the layer exists to avoid.
 */
export function residueMapping({
  mappings,
  chain,
  observed,
  row,
  accession,
  pdb,
  rowLength,
  kind = 'experimental',
}) {
  const segments = mappings
    .filter(m => m.chain_id === chain)
    .map(m => ({
      rowStart: m.unp_start,
      rowEnd: m.unp_end,
      structStart: m.start.residue_number,
      structEnd: m.end.residue_number,
    }))
    .sort((a, b) => a.rowStart - b.rowStart)

  // positions the entity declares and did not resolve, as ranges. Only within
  // the mapped segments: outside them there is nothing to ask about, since a
  // lookup that lands there is unmapped before observation is even a question.
  const unobserved = []
  for (const segment of segments) {
    for (let pos = segment.structStart; pos <= segment.structEnd; pos++) {
      if (observed.has(pos)) {
        continue
      }
      const last = unobserved.at(-1)
      if (last && last[1] === pos - 1) {
        last[1] = pos
      } else {
        unobserved.push([pos, pos])
      }
    }
  }

  return {
    row,
    accession,
    structure: {
      id: pdb.toUpperCase(),
      kind,
      asymId: chain,
      url: structureUrl(pdb),
    },
    segments,
    ...(unobserved.length ? { unobserved } : {}),
    rowLength,
    generated: { by: 'sifts', date: new Date().toISOString().slice(0, 10) },
  }
}

// An alignment row, ungapped, out of an examples data file (FASTA or CLUSTAL).
export function readRow(file, row) {
  const text = fs.readFileSync(path.join(dataDir, file), 'utf8')
  const parts = []
  let capturing = false
  for (const line of text.split('\n')) {
    if (text.startsWith('>')) {
      if (line.startsWith('>')) {
        capturing = line.slice(1).trim() === row
      } else if (capturing) {
        parts.push(line)
      }
    } else if (line.startsWith(`${row} `) || line.startsWith(`${row}\t`)) {
      parts.push(line.slice(row.length))
    }
  }
  const seq = parts.join('').replace(/\s/g, '').replaceAll('-', '')
  if (!seq) {
    throw new Error(`row ${row} not found in ${file}`)
  }
  return seq
}

/**
 * Three coordinate systems have to agree for a structure-derived layer to land
 * where it came from: the structure's, UniProt's, and the alignment row's.
 * SIFTS settles the first two. The third is an assumption -- that this row's
 * residue n IS UniProt's residue n -- which holds for a full-length sequence
 * and fails silently for a fragment row, the `/27-137` case a domain alignment
 * is full of. It fails in the direction that looks like it worked, so check it
 * against what the structure actually contains rather than trusting it.
 */
export function checkRowNumbering({ points, toUniprot, seq, row, pdb }) {
  let checked = 0
  const mismatches = []
  for (const [seqId, { comp }] of points) {
    const pos = toUniprot(seqId)
    const expected = THREE_TO_ONE[comp]
    if (pos === undefined || !expected) {
      continue
    }
    checked++
    if (seq[pos - 1] !== expected) {
      mismatches.push(
        `${pos}: row has ${seq[pos - 1] ?? '(past the end)'}, ${pdb.toUpperCase()} has ${comp}`,
      )
    }
  }
  if (!checked) {
    throw new Error(`no residue of ${row} could be checked against ${pdb}`)
  }
  if (mismatches.length) {
    throw new Error(
      `${mismatches.length}/${checked} residues disagree between ${row} and ` +
        `its accession's numbering, so the layer would be drawn in the wrong ` +
        `places. Is that row a fragment rather than the full-length sequence?\n  ` +
        mismatches.slice(0, 5).join('\n  '),
    )
  }
  console.log(`${checked} residues of ${row} match ${pdb.toUpperCase()}`)
  return checked
}

export function writeJson(outFile, value) {
  fs.writeFileSync(outFile, `${JSON.stringify(value, null, 2)}\n`)
  console.log(`wrote ${outFile}`)
}

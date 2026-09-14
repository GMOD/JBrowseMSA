/**
 * The sickle-cell layers for the globin example: where the variant is, what a
 * variant-effect predictor says about every position around it, and which
 * residue of the solved hemoglobin tetramer each row residue is.
 *
 * One substitution, three numbers. HBB Glu->Val is p.Glu7Val in HGVS, which
 * counts the initiator methionine UniProt keeps; it is "E6V" in the clinical
 * literature and residue 6 of chain B in PDB 1A3N, both of which count the
 * mature chain after that methionine is cleaved. The alignment row is the
 * UniProt sequence, so the highlight goes on residue 7 -- and the SIFTS
 * mapping, written out as a `residueMappings` layer, is what turns that into
 * the structure's 6 without anyone subtracting one by hand.
 *
 * Steps:
 *   1. SIFTS (PDBe) for 1A3N: HBB chain B and HBA chain A, checked residue by
 *      residue against the alignment rows.
 *   2. AlphaFold's per-substitution AlphaMissense table for P68871, read from
 *      the `amAnnotationsUrl` the API gives rather than a constructed filename,
 *      averaged per residue into a bar track.
 *   3. The highlight naming the sickle position.
 *
 * Writes packages/examples/src/examples/hemoglobinSickle.json.
 *
 *   node scripts/examples-gen/hemoglobin.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  checkRowNumbering,
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
  '../../packages/examples/src/examples/hemoglobinSickle.json',
)

const PDB = '1a3n'
const MSA = 'globin.fa'
// 1A3N is the alpha2-beta2 tetramer, so each chain appears twice (A/C alpha,
// B/D beta). One chain per row keeps the forward lookup unique -- two mappings
// from one row onto one structure id is exactly the ambiguity
// model.structureResidue refuses to answer.
const CHAINS = [
  { row: 'Human_beta', accession: 'P68871', chain: 'B', gene: 'HBB' },
  { row: 'Human_alpha', accession: 'P69905', chain: 'A', gene: 'HBA1' },
]
const SICKLE = { row: 'Human_beta', seqPos: 7, from: 'E', to: 'V' }

// AlphaFold's API rejects a request with no User-Agent (403), which reads as
// "no such entry" if you do not check the status.
const UA = {
  'User-Agent':
    'react-msaview-examples (https://github.com/GMOD/react-msaview)',
}

// AlphaFold publishes the AlphaMissense table per entry; the URL is a field of
// the prediction record, not a filename to build, so read it from there.
async function alphaMissense(accession, length) {
  const api = await fetch(
    `https://alphafold.ebi.ac.uk/api/prediction/${accession}`,
    { headers: UA },
  )
  if (!api.ok) {
    throw new Error(`AlphaFold API failed for ${accession}: ${api.status}`)
  }
  const [entry] = await api.json()
  const url = entry?.amAnnotationsUrl
  if (!url) {
    throw new Error(`${accession} has no AlphaMissense annotations`)
  }
  const csv = await (await fetch(url, { headers: UA })).text()
  const sums = new Array(length).fill(0)
  const counts = new Array(length).fill(0)
  const byVariant = new Map()
  for (const line of csv.split('\n').slice(1)) {
    const [variant, score, klass] = line.split(',')
    const m = /^([A-Z])(\d+)([A-Z])$/.exec(variant ?? '')
    if (!m) {
      continue
    }
    const pos = Number(m[2])
    if (pos < 1 || pos > length) {
      throw new Error(`${variant} is outside the ${length}-residue sequence`)
    }
    sums[pos - 1] += Number(score)
    counts[pos - 1]++
    byVariant.set(variant, { score: Number(score), class: klass?.trim() })
  }
  const missing = counts.findIndex(n => n === 0)
  if (missing !== -1) {
    throw new Error(`no AlphaMissense scores at residue ${missing + 1}`)
  }
  return {
    url,
    values: sums.map((sum, i) => Number((sum / counts[i]).toFixed(4))),
    byVariant,
  }
}

const atoms = await fetchStructure(PDB)
const mappings = []
for (const { row, accession, chain, gene } of CHAINS) {
  const sifts = await fetchSifts(PDB, accession)
  const seq = readRow(MSA, row)
  checkRowNumbering({
    points: residuePoints(atoms, chain),
    toUniprot: sequenceToUniprot(sifts, chain),
    seq,
    row,
    pdb: PDB,
  })
  mappings.push({
    gene,
    ...residueMapping({
      mappings: sifts,
      chain,
      observed: observedResidues(atoms, chain),
      row,
      accession,
      pdb: PDB,
      rowLength: seq.length,
    }),
  })
}

const beta = mappings.find(m => m.row === SICKLE.row)
const betaSeq = readRow(MSA, SICKLE.row)
if (betaSeq[SICKLE.seqPos - 1] !== SICKLE.from) {
  throw new Error(
    `${SICKLE.row} residue ${SICKLE.seqPos} is ${betaSeq[SICKLE.seqPos - 1]}, not ${SICKLE.from}`,
  )
}
const segment = beta.segments.find(
  s => SICKLE.seqPos >= s.rowStart && SICKLE.seqPos <= s.rowEnd,
)
const structurePosition =
  segment.structStart + (SICKLE.seqPos - segment.rowStart)

const am = await alphaMissense('P68871', betaSeq.length)
const variant = `${SICKLE.from}${SICKLE.seqPos}${SICKLE.to}`
const sickleScore = am.byVariant.get(variant)
if (!sickleScore) {
  throw new Error(`${variant} is not in the AlphaMissense table`)
}
const hgvs = `p.Glu${SICKLE.seqPos}Val`
const legacy = `${SICKLE.from}${structurePosition}${SICKLE.to}`

writeJson(outFile, {
  generatedBy: 'scripts/examples-gen/hemoglobin.mjs',
  description:
    `Sickle-cell layers for the globin alignment. The highlight is the HBB ` +
    `substitution that causes sickle-cell disease, on the row's own ` +
    `(UniProt) numbering; the bar track is the mean AlphaMissense ` +
    `pathogenicity of the 19 substitutions at each residue of HBB; the ` +
    `residue mappings are SIFTS, and are what turns row residue ` +
    `${SICKLE.seqPos} into ${PDB.toUpperCase()} residue ${structurePosition}.`,
  sources: {
    sifts: `https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${PDB}`,
    alphaMissense: am.url,
    alphaFoldApi: 'https://alphafold.ebi.ac.uk/api/prediction/P68871',
  },
  retrieved: new Date().toISOString().slice(0, 10),
  sickle: {
    row: SICKLE.row,
    seqPos: SICKLE.seqPos,
    hgvs,
    legacy,
    structure: {
      id: PDB.toUpperCase(),
      asymId: 'B',
      position: structurePosition,
    },
    alphaMissense: sickleScore,
    label: `HBB ${legacy} (${hgvs}) · sickle cell`,
  },
  alphaMissense: {
    row: SICKLE.row,
    accession: 'P68871',
    name: 'AlphaMissense (mean per residue)',
    max: 1,
    values: am.values,
  },
  residueMappings: mappings.map(({ gene, ...mapping }) => mapping),
})

console.log(
  `${SICKLE.row} residue ${SICKLE.seqPos} (${hgvs}) is ${PDB.toUpperCase()} ` +
    `residue ${structurePosition}: ${legacy}\n` +
    `AlphaMissense ${variant}: ${sickleScore.score} (${sickleScore.class}); ` +
    `mean at that residue ${am.values[SICKLE.seqPos - 1]}, ` +
    `highest residue mean ${Math.max(...am.values)}`,
)

/**
 * The sickle-cell layers for the hemoglobin example: the variant position on
 * the HBB_HUMAN row and the mean AlphaMissense score at every residue of HBB.
 *
 * HBB Glu->Val is p.Glu7Val in HGVS, which counts the initiator methionine
 * UniProt keeps. The clinical literature calls it "E6V", counting the mature
 * chain after the methionine is cleaved, as the PDB does. The alignment row is
 * the UniProt sequence, so the highlight goes on residue 7; the example maps
 * the row onto 4HHB in the browser, which lights residue 6 of chain B.
 *
 * Reads the HBB_HUMAN row from structureAlignments.json, the alignment the
 * example draws, and AlphaFold's per-substitution AlphaMissense table for
 * P68871 from the `amAnnotationsUrl` the API gives. Writes
 * packages/examples/src/examples/hemoglobinSickle.json.
 *
 *   node scripts/examples-gen/hemoglobin.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { rowSequence, writeJson } from './structure.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const examplesDir = path.resolve(here, '../../packages/examples/src/examples')
const outFile = path.join(examplesDir, 'hemoglobinSickle.json')
const alignmentFile = path.join(examplesDir, 'structureAlignments.json')

const SICKLE = { row: 'HBB_HUMAN', seqPos: 7, from: 'E', to: 'V' }
const ACCESSION = 'P68871'

// AlphaFold's API rejects a request with no User-Agent (403), which reads as
// "no such entry" if you do not check the status.
const UA = {
  'User-Agent':
    'react-msaview-examples (https://github.com/GMOD/react-msaview)',
}

// the AlphaMissense table URL is a field of the prediction record
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

const { globins } = JSON.parse(fs.readFileSync(alignmentFile, 'utf8'))
const betaSeq = rowSequence(globins.msa, SICKLE.row, alignmentFile)
if (betaSeq[SICKLE.seqPos - 1] !== SICKLE.from) {
  throw new Error(
    `${SICKLE.row} residue ${SICKLE.seqPos} is ${betaSeq[SICKLE.seqPos - 1]}, not ${SICKLE.from}`,
  )
}

const am = await alphaMissense(ACCESSION, betaSeq.length)
const variant = `${SICKLE.from}${SICKLE.seqPos}${SICKLE.to}`
const sickleScore = am.byVariant.get(variant)
if (!sickleScore) {
  throw new Error(`${variant} is not in the AlphaMissense table`)
}
const hgvs = `p.Glu${SICKLE.seqPos}Val`
const legacy = `${SICKLE.from}${SICKLE.seqPos - 1}${SICKLE.to}`

writeJson(outFile, {
  generatedBy: 'scripts/examples-gen/hemoglobin.mjs',
  description:
    `Sickle-cell layers for the globin alignment. The highlight is the HBB ` +
    `substitution that causes sickle-cell disease, on the row's own ` +
    `(UniProt) numbering; the bar track is the mean AlphaMissense ` +
    `pathogenicity of the 19 substitutions at each residue of HBB.`,
  sources: {
    alphaMissense: am.url,
    alphaFoldApi: `https://alphafold.ebi.ac.uk/api/prediction/${ACCESSION}`,
  },
  retrieved: new Date().toISOString().slice(0, 10),
  sickle: {
    row: SICKLE.row,
    seqPos: SICKLE.seqPos,
    hgvs,
    legacy,
    alphaMissense: sickleScore,
    label: `HBB ${legacy} (${hgvs}) · sickle cell`,
  },
  alphaMissense: {
    row: SICKLE.row,
    accession: ACCESSION,
    name: 'AlphaMissense (mean per residue)',
    max: 1,
    values: am.values,
  },
})

console.log(
  `${SICKLE.row} residue ${SICKLE.seqPos} (${hgvs}) is ${legacy} in the ` +
    `mature chain\n` +
    `AlphaMissense ${variant}: ${sickleScore.score} (${sickleScore.class}); ` +
    `mean at that residue ${am.values[SICKLE.seqPos - 1]}, ` +
    `highest residue mean ${Math.max(...am.values)}`,
)

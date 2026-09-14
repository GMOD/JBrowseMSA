/**
 * Per-residue pathogenic-variant counts for the p53 example, from ClinVar.
 *
 * The counts record where a change is known to cause disease, which the
 * alignment's conservation track can't show. Both tracks peak in the
 * DNA-binding domain.
 *
 * Steps:
 *   1. esearch ClinVar for the gene's missense variants.
 *   2. esummary in batches, keeping records classified pathogenic or likely
 *      pathogenic. The esearch term also matches "Conflicting
 *      classifications", so the script filters on each record's own
 *      classification.
 *   3. Parse the protein change (p.Arg248Gln) from the variant name on the
 *      reference transcript, and count the distinct alleles at each residue.
 *      The script drops nonsense changes: a stop disables everything
 *      downstream of it, so it does not belong on a per-residue count.
 *
 * Writes packages/examples/src/examples/p53ClinVar.json.
 *
 *   node scripts/examples-gen/clinvar.mjs
 *
 * NCBI asks unauthenticated callers to stay under 3 requests/second and to
 * identify the tool; add an api_key to EUTILS_PARAMS if you need to go faster.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.resolve(
  here,
  '../../packages/examples/src/examples/p53ClinVar.json',
)

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const EUTILS_PARAMS = 'tool=react-msaview-examples&retmode=json'
const GENE = 'TP53'
const TRANSCRIPT = 'NM_000546'
const ROW = 'Human'
const LENGTH = 393
const TERM = `${GENE}[gene] AND "missense variant"[molecular consequence]`
const PATHOGENIC = new Set([
  'Pathogenic',
  'Likely pathogenic',
  'Pathogenic/Likely pathogenic',
])

const THREE_LETTER = new Set([
  'Ala',
  'Arg',
  'Asn',
  'Asp',
  'Cys',
  'Gln',
  'Glu',
  'Gly',
  'His',
  'Ile',
  'Leu',
  'Lys',
  'Met',
  'Phe',
  'Pro',
  'Ser',
  'Thr',
  'Trp',
  'Tyr',
  'Val',
])
// e.g. NM_000546.6(TP53):c.743G>A (p.Arg248Gln)
const PROTEIN_CHANGE = /\(p\.([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2})\)/

async function eutils(endpoint, query) {
  const res = await fetch(
    `${EUTILS}/${endpoint}.fcgi?${EUTILS_PARAMS}&${query}`,
  )
  if (!res.ok) {
    throw new Error(`${endpoint} failed: ${res.status}`)
  }
  return res.json()
}

const search = await eutils(
  'esearch',
  `db=clinvar&retmax=5000&term=${encodeURIComponent(TERM)}`,
)
const ids = search.esearchresult.idlist
console.log(`${ids.length} ${GENE} missense records in ClinVar`)

const counts = new Array(LENGTH).fill(0)
let kept = 0
let offTranscript = 0
for (let i = 0; i < ids.length; i += 200) {
  const { result } = await eutils(
    'esummary',
    `db=clinvar&id=${ids.slice(i, i + 200).join(',')}`,
  )
  for (const uid of result.uids) {
    const record = result[uid]
    if (!PATHOGENIC.has(record.germline_classification?.description)) {
      continue
    }
    for (const variant of record.variation_set ?? []) {
      const name = variant.variation_name ?? ''
      if (!name.startsWith(TRANSCRIPT)) {
        offTranscript++
        continue
      }
      const change = PROTEIN_CHANGE.exec(name)
      // a stop disables everything downstream, so it is not a per-residue change
      if (!change || !THREE_LETTER.has(change[3])) {
        continue
      }
      const pos = Number(change[2])
      if (pos >= 1 && pos <= LENGTH) {
        counts[pos - 1]++
        kept++
      }
    }
  }
  await new Promise(resolve => setTimeout(resolve, 400))
}

const max = Math.max(...counts)
const residuesHit = counts.filter(n => n > 0).length
const top = counts
  .map((n, i) => ({ residue: i + 1, n }))
  .filter(r => r.n === max)
  .map(r => r.residue)

fs.writeFileSync(
  outFile,
  `${JSON.stringify(
    {
      generatedBy: 'scripts/examples-gen/clinvar.mjs',
      description:
        `Distinct missense alleles at each residue of ${GENE} that ClinVar ` +
        `classifies as pathogenic or likely pathogenic, on ${TRANSCRIPT}. ` +
        `One entry per residue of the ${ROW} row, position 1 first. A count ` +
        `is how many different substitutions are on record there, not how ` +
        `many patients carry one -- ClinVar counts alleles, and a residue ` +
        `saturates once every substitution reachable by a single base change ` +
        `has been reported.`,
      source: 'https://www.ncbi.nlm.nih.gov/clinvar/',
      query: TERM,
      classifications: [...PATHOGENIC],
      retrieved: new Date().toISOString().slice(0, 10),
      gene: GENE,
      transcript: TRANSCRIPT,
      row: ROW,
      alleles: kept,
      residuesHit,
      max,
      counts,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `${kept} pathogenic missense alleles over ${residuesHit}/${LENGTH} residues; ` +
    `deepest ${max} at ${top.join(', ')}` +
    (offTranscript ? ` (${offTranscript} off ${TRANSCRIPT}, skipped)` : ''),
)
console.log(`wrote ${outFile}`)

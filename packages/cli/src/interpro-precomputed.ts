import * as fs from 'node:fs'

import { annotationsToGFF, getUngappedSequence, parseMSA } from 'msa-parsers'

import {
  cacheLocation,
  fetchWithRetry,
  readCached,
  writeCached,
} from './interpro-cache.ts'

import type { MSAFormat } from 'msa-parsers'

// Build a domain GFF from the InterPro API's precomputed matches for UniProtKB
// accessions. The lookup returns in seconds, is pinned to one InterPro release,
// and needs no email or job submission.
//
// Input: one accession per line, optional whitespace-separated row label
// (`<accession>\t<label>`); lines starting with # are ignored. The format matches
// scripts/examples-gen datasets/<name>.tsv. The output GFF is keyed by label and
// written by the same annotationsToGFF as the interproscan command.

const API = 'https://www.ebi.ac.uk/interpro/api'

export interface InterProPrecomputedOptions {
  inputFile: string
  outputFile: string
  database: string
  noCache?: boolean
  msaFile?: string
  format?: MSAFormat
}

interface Accession {
  accession: string
  label: string
}

interface ApiFragment {
  start: number
  end: number
}
interface ApiLocation {
  fragments: ApiFragment[]
}
interface ApiProtein {
  entry_protein_locations: ApiLocation[]
  protein_length?: number
}
interface ApiMetadata {
  accession: string
  name: string
  integrated: string | null
}
interface ApiResult {
  metadata: ApiMetadata
  proteins: ApiProtein[]
}
interface ApiEntryResponse {
  results: ApiResult[]
  next: string | null
}
interface ApiRootResponse {
  databases: { interpro: { version: string } }
}

function parseAccessions(text: string): Accession[] {
  const out: Accession[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line && !line.startsWith('#')) {
      const sep = line.search(/\s/)
      if (sep === -1) {
        out.push({ accession: line, label: line })
      } else {
        out.push({
          accession: line.slice(0, sep),
          label: line.slice(sep + 1).trim(),
        })
      }
    }
  }
  return out
}

// requested on every run; cache entries are keyed by this release, so a new
// release fetches fresh coordinates
async function fetchRelease(): Promise<string> {
  const res = await fetchWithRetry(`${API}/`)
  if (!res.ok) {
    throw new Error(`InterPro release lookup failed: ${res.status}`)
  }
  const json = (await res.json()) as ApiRootResponse
  return json.databases.interpro.version
}

/**
 * Every entry the member database has for one protein, following `next` across
 * pages (P98161 has 24 InterPro entries, more than one default page of 20).
 */
async function fetchEntries(
  accession: string,
  database: string,
): Promise<ApiResult[]> {
  const results: ApiResult[] = []
  let url: string | null =
    `${API}/entry/${database}/protein/uniprot/${accession}/?page_size=200`
  while (url) {
    const res = await fetchWithRetry(url)
    // 204 = the protein exists but has no matches in this member database.
    if (res.status === 204 || res.status === 404) {
      break
    }
    if (!res.ok) {
      throw new Error(`InterPro lookup ${accession} failed: ${res.status}`)
    }
    const json = (await res.json()) as ApiEntryResponse
    results.push(...json.results)
    url = json.next
  }
  return results
}

export async function runInterProPrecomputed(
  options: InterProPrecomputedOptions,
): Promise<void> {
  const { inputFile, outputFile, database, noCache } = options
  console.log(`Reading accessions from ${inputFile}...`)
  const accessions = parseAccessions(fs.readFileSync(inputFile, 'utf8'))
  // rows sharing an accession under different labels share one lookup
  const distinct = [...new Set(accessions.map(a => a.accession))]
  const extra =
    distinct.length === accessions.length
      ? ''
      : ` (${distinct.length} distinct)`
  console.log(`Found ${accessions.length} accessions${extra}`)

  const release = await fetchRelease()
  console.log(
    `InterPro release ${release}; reading precomputed ${database} matches...`,
  )

  const entriesByAccession = new Map<string, ApiResult[]>()
  let fetched = 0
  let cached = 0
  for (const [i, accession] of distinct.entries()) {
    const hit = noCache
      ? undefined
      : readCached<ApiResult[]>(release, database, accession)
    let entries: ApiResult[]
    if (hit) {
      entries = hit
      cached++
    } else {
      try {
        entries = await fetchEntries(accession, database)
      } catch (e) {
        // accessions resolved so far are cached, so a re-run resumes here
        throw new Error(
          `${e}\n${i} of ${distinct.length} accessions are cached; re-run to resume from ${accession}.`,
        )
      }
      writeCached(release, database, accession, entries)
      fetched++
    }
    entriesByAccession.set(accession, entries)
    console.log(
      `  [${i + 1}/${distinct.length}] ${accession}: ${entries.length} ${database} entries${hit ? ' (cached)' : ''}`,
    )
    // a typo, a non-UniProtKB id and a protein with no matches all return empty
    if (entries.length === 0) {
      console.warn(
        `    no ${database} matches for ${accession}; check it is a UniProtKB accession and that --database is the right member database`,
      )
    }
  }

  const annotations = accessions.flatMap(({ accession, label }) =>
    (entriesByAccession.get(accession) ?? []).flatMap(
      ({ metadata, proteins }) =>
        (proteins[0]?.entry_protein_locations ?? []).flatMap(loc =>
          loc.fragments.map(f => ({
            id: label,
            accession: metadata.integrated ?? metadata.accession,
            name: metadata.name,
            description: metadata.name,
            start: f.start,
            end: f.end,
          })),
        ),
    ),
  )

  console.log(`${fetched} fetched, ${cached} from ${cacheLocation()}`)

  if (options.msaFile) {
    checkLengths(
      options.msaFile,
      options.format,
      accessions,
      entriesByAccession,
    )
  }

  const gff = annotationsToGFF(annotations, [
    `precomputed InterPro ${release} ${database} matches by UniProtKB accession (react-msaview-cli interpro --database ${database})`,
  ])
  fs.writeFileSync(outputFile, `${gff}\n`, 'utf8')
  console.log(`Wrote ${outputFile}`)
}

/**
 * Warn where a row is not the protein the matches were computed on.
 *
 * The coordinates come from UniProt's canonical sequence. An isoform or fragment
 * row has a different length, and its domains would land on wrong residues with
 * no other sign of the problem.
 */
function checkLengths(
  msaFile: string,
  format: MSAFormat | undefined,
  accessions: Accession[],
  entriesByAccession: Map<string, ApiResult[]>,
) {
  const msa = parseMSA(fs.readFileSync(msaFile, 'utf8'), 0, format)
  const names = new Set(msa.getNames())
  for (const { accession, label } of accessions) {
    const proteinLength = entriesByAccession
      .get(accession)
      ?.map(e => e.proteins[0]?.protein_length)
      .find(l => l !== undefined)
    if (!names.has(label)) {
      console.warn(`  ${label}: no such row in ${msaFile}`)
    } else if (proteinLength !== undefined) {
      const rowLength = getUngappedSequence(msa.getRow(label)).length
      if (rowLength !== proteinLength) {
        console.warn(
          `  ${label}: row is ${rowLength} residues, ${accession} is ${proteinLength}; the matches are computed on the canonical sequence, so an isoform or fragment puts them on the wrong residues`,
        )
      }
    }
  }
}

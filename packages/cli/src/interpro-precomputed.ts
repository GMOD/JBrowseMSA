import * as fs from 'node:fs'

import { interProToGFF } from 'msa-parsers'

import {
  cacheLocation,
  fetchWithRetry,
  readCached,
  writeCached,
} from './interpro-cache.ts'

// Build a domain GFF from InterPro's PRECOMPUTED matches for UniProtKB
// accessions, instead of submitting sequences to a live InterProScan job. Every
// UniProtKB sequence already has InterPro matches computed and served by the
// EBI InterPro API, so for inputs that are real UniProt accessions this is
// instant, deterministic, version-pinnable (one InterPro release) and needs no
// email or rate-limited job submission — see scripts/examples-gen/README.md.
//
// Input: one accession per line, optional whitespace-separated row label
// (`<accession>\t<label>`); lines starting with # are ignored. This is exactly
// the scripts/examples-gen datasets/<name>.tsv format, so it can be run on those
// directly. Output GFF is keyed by label and matches the interproscan command's
// format byte-for-byte (it reuses interProToGFF).

const API = 'https://www.ebi.ac.uk/interpro/api'

export interface InterProPrecomputedOptions {
  inputFile: string
  outputFile: string
  database: string
  noCache?: boolean
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

// The one request a run makes regardless of cache state, and the thing that
// makes caching safe: entries are keyed by release, so a new InterPro release
// misses rather than serving coordinates computed against the old one.
async function fetchRelease(): Promise<string> {
  const res = await fetchWithRetry(`${API}/`)
  if (!res.ok) {
    throw new Error(`InterPro release lookup failed: ${res.status}`)
  }
  const json = (await res.json()) as ApiRootResponse
  return json.databases.interpro.version
}

async function fetchEntries(
  accession: string,
  database: string,
): Promise<ApiResult[]> {
  const res = await fetchWithRetry(
    `${API}/entry/${database}/protein/uniprot/${accession}/`,
  )
  // 204 = the protein exists but has no matches in this member database.
  let results: ApiResult[] = []
  if (res.status !== 204) {
    if (!res.ok) {
      throw new Error(`InterPro lookup ${accession} failed: ${res.status}`)
    }
    const json = (await res.json()) as ApiEntryResponse
    results = json.results
  }
  return results
}

export async function runInterProPrecomputed(
  options: InterProPrecomputedOptions,
): Promise<void> {
  const { inputFile, outputFile, database, noCache } = options
  console.log(`Reading accessions from ${inputFile}...`)
  const accessions = parseAccessions(fs.readFileSync(inputFile, 'utf8'))
  // two rows can carry the same accession under different labels; that is one
  // protein to look up, then copied to each label
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
        // every accession resolved so far is on disk, so the re-run this
        // prompts resumes from here instead of asking EBI for them again
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
  }

  const results: Record<
    string,
    {
      matches: {
        signature: {
          entry: { accession: string; name: string; description: string }
        }
        locations: ApiFragment[]
      }[]
      xref: { id: string }[]
    }
  > = {}

  for (const { accession, label } of accessions) {
    const matches = (entriesByAccession.get(accession) ?? [])
      .map(({ metadata, proteins }) => ({
        signature: {
          entry: {
            accession: metadata.integrated ?? metadata.accession,
            name: metadata.name,
            description: metadata.name,
          },
        },
        locations: (proteins[0]?.entry_protein_locations ?? []).flatMap(loc =>
          loc.fragments.map(f => ({ start: f.start, end: f.end })),
        ),
      }))
      .filter(m => m.locations.length > 0)
    results[label] = { matches, xref: [{ id: label }] }
  }

  console.log(`${fetched} fetched, ${cached} from ${cacheLocation()}`)

  const gff = interProToGFF(results).replace(
    '##gff-version 3',
    `##gff-version 3\n# precomputed InterPro ${release} ${database} matches by UniProtKB accession (react-msaview-cli interpro --database ${database})`,
  )
  fs.writeFileSync(outputFile, `${gff}\n`, 'utf8')
  console.log(`Wrote ${outputFile}`)
}

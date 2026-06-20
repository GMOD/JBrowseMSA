import * as fs from 'node:fs'

import { interProToGFF } from 'msa-parsers'

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

async function fetchRelease(): Promise<string> {
  const res = await fetch(`${API}/`)
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
  const res = await fetch(
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
  const { inputFile, outputFile, database } = options
  console.log(`Reading accessions from ${inputFile}...`)
  const accessions = parseAccessions(fs.readFileSync(inputFile, 'utf8'))
  console.log(`Found ${accessions.length} accessions`)

  const release = await fetchRelease()
  console.log(
    `InterPro release ${release}; fetching precomputed ${database} matches...`,
  )

  const results: Record<
    string,
    {
      matches: {
        signature: { entry: { accession: string; name: string; description: string } }
        locations: ApiFragment[]
      }[]
      xref: { id: string }[]
    }
  > = {}

  let done = 0
  for (const { accession, label } of accessions) {
    done++
    const entries = await fetchEntries(accession, database)
    const matches = entries
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
    console.log(
      `  [${done}/${accessions.length}] ${label} (${accession}): ${matches.length} ${database} domains`,
    )
  }

  const gff = interProToGFF(results).replace(
    '##gff-version 3',
    `##gff-version 3\n# precomputed InterPro ${release} ${database} matches by UniProtKB accession (react-msaview-cli interpro --database ${database})`,
  )
  fs.writeFileSync(outputFile, `${gff}\n`, 'utf8')
  console.log(`Wrote ${outputFile}`)
}

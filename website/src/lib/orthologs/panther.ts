// Ortholog proteins for a gene from PANTHER, the source that covers the species
// NCBI's ortholog sets leave out (yeast, worm, plant). One call maps a gene
// symbol + taxon to a UniProt accession per target genome; a second pulls the
// sequences from UniProt. Both hosts send `access-control-allow-origin: *`.
// Measurements and the argument for PANTHER over OMA/OrthoDB/Ensembl:
// agent-docs/ideas/ortholog-sources-beyond-ncbi.md

const PANTHER = 'https://pantherdb.org/services/oai/pantherdb'
const UNIPROT = 'https://rest.uniprot.org/uniprotkb'

export interface OrthologProtein {
  label: string
  taxId: number
  accession: string
  sequence: string
}

// A readable panel spanning the tree, in display order. Every entry is a
// PANTHER reference proteome (see parseGenomes) so it can be a target.
export const DEFAULT_TAXA = [
  9606, // human
  10090, // mouse
  10116, // rat
  9913, // cow
  9615, // dog
  9031, // chicken
  8364, // frog (X. tropicalis)
  7955, // zebrafish
  7227, // fruit fly
  6239, // C. elegans
  559292, // budding yeast
  3702, // Arabidopsis
  39947, // rice
  44689, // Dictyostelium
]

export interface PantherGenome {
  code: string // PANTHER's 5-letter organism code, e.g. HUMAN
  taxId: number
  name: string // short common name, e.g. fruit_fly
  longName: string // scientific name
}

interface GenomesResponse {
  search?: {
    output?: {
      genomes?: {
        genome?: {
          short_name?: string
          taxon_id?: number
          name?: string
          long_name?: string
        }[]
      }
    }
  }
}

// `supportedgenomes` -> the code<->taxon map every other parse needs. PANTHER
// names organisms by code only in ortholog results.
export function parseGenomes(json: unknown): PantherGenome[] {
  const list = (json as GenomesResponse).search?.output?.genomes?.genome ?? []
  return list.flatMap(g =>
    g.short_name && g.taxon_id
      ? [
          {
            code: g.short_name,
            taxId: g.taxon_id,
            name: g.name ?? g.short_name,
            longName: g.long_name ?? g.short_name,
          },
        ]
      : [],
  )
}

export interface PantherHit {
  code: string
  accession: string
  symbol?: string
  // LDO = least diverged ortholog, PANTHER's pick of the one-to-one; O = any
  // other ortholog in a one-to-many or many-to-many family
  type: 'LDO' | 'O'
}

interface Mapping {
  id?: string
  gene?: string
  target_gene?: string
  target_gene_symbol?: string | number
  ortholog?: string
}

interface MatchResponse {
  search?: {
    mapping?: {
      // one object for a single (or empty) match, an array otherwise
      mapped?: Mapping | Mapping[]
      unmapped_ids?: unknown
    }
  }
}

// "HUMAN|HGNC=1773|UniProtKB=P11802" -> { code, accession }
function parseGeneRef(ref: string | undefined) {
  const [code, ...xrefs] = (ref ?? '').split('|')
  const accession = xrefs
    .find(x => x.startsWith('UniProtKB='))
    ?.slice('UniProtKB='.length)
  return code && accession ? { code, accession } : undefined
}

// `matchortho` -> the query's own accession (PANTHER names it in every row) and
// one hit per target gene. An unknown gene comes back under `unmapped_ids`; a
// gene with no ortholog in the target set comes back as a bare `{ id }`.
export function parseMatches(json: unknown): {
  unmapped: boolean
  queryAccession?: string
  hits: PantherHit[]
} {
  const mapping = (json as MatchResponse).search?.mapping
  const mapped = mapping?.mapped
  const rows = Array.isArray(mapped) ? mapped : mapped ? [mapped] : []
  const hits: PantherHit[] = []
  let queryAccession: string | undefined
  for (const row of rows) {
    queryAccession ??= parseGeneRef(row.gene)?.accession
    const target = parseGeneRef(row.target_gene)
    if (target && (row.ortholog === 'LDO' || row.ortholog === 'O')) {
      hits.push({
        ...target,
        symbol:
          row.target_gene_symbol === undefined
            ? undefined
            : String(row.target_gene_symbol),
        type: row.ortholog,
      })
    }
  }
  return { unmapped: !!mapping?.unmapped_ids, queryAccession, hits }
}

// One hit per organism: the LDO where PANTHER named one, else the first other
// ortholog it listed. A many-to-many family (the Hox genes) has no LDO at all,
// so dropping to "first O" is what keeps those species in the alignment.
export function pickOnePerGenome(hits: PantherHit[]): PantherHit[] {
  const byCode = new Map<string, PantherHit>()
  for (const hit of hits) {
    const current = byCode.get(hit.code)
    if (!current || (current.type === 'O' && hit.type === 'LDO')) {
      byCode.set(hit.code, hit)
    }
  }
  return [...byCode.values()]
}

interface UniProtResponse {
  results?: {
    primaryAccession?: string
    organism?: { taxonId?: number }
    sequence?: { value?: string }
  }[]
}

// `uniprotkb/accessions` -> accession -> sequence
export function parseSequences(json: unknown): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of (json as UniProtResponse).results ?? []) {
    if (r.primaryAccession && r.sequence?.value) {
      map.set(r.primaryAccession, r.sequence.value)
    }
  }
  return map
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`${new URL(url).host} request failed (${res.status})`)
  }
  return res.json()
}

let genomes: Promise<PantherGenome[]> | undefined
export function fetchGenomes() {
  genomes ??= fetchJson(`${PANTHER}/supportedgenomes`)
    .then(parseGenomes)
    .catch((e: unknown) => {
      genomes = undefined
      throw e
    })
  return genomes
}

// UniProt caps one `accessions` call at 100 ids
const UNIPROT_CHUNK = 100

async function fetchSequences(accessions: string[]) {
  const map = new Map<string, string>()
  for (let i = 0; i < accessions.length; i += UNIPROT_CHUNK) {
    const chunk = accessions.slice(i, i + UNIPROT_CHUNK)
    const json = await fetchJson(
      `${UNIPROT}/accessions?accessions=${chunk.join(',')}&fields=accession,organism_id,sequence&format=json`,
    )
    for (const [acc, seq] of parseSequences(json)) {
      map.set(acc, seq)
    }
  }
  return map
}

// The query species first, then one ortholog per target taxon in `taxa` order.
// `symbol` is what PANTHER matches against unless a UniProt accession is known,
// which is unambiguous. Taxa PANTHER has no proteome for are skipped, as are
// hits whose accession UniProt no longer serves.
export async function fetchOrthologProteins({
  symbol,
  taxId,
  uniprotId,
  taxa = DEFAULT_TAXA,
}: {
  symbol: string
  taxId: number
  uniprotId?: string
  taxa?: number[]
}): Promise<OrthologProtein[]> {
  const all = await fetchGenomes()
  const byTaxId = new Map(all.map(g => [g.taxId, g]))
  const byCode = new Map(all.map(g => [g.code, g]))
  const query = byTaxId.get(taxId)
  if (!query) {
    throw new Error(`PANTHER has no reference proteome for taxon ${taxId}`)
  }
  const targets = taxa.filter(t => t !== taxId && byTaxId.has(t))
  const params = new URLSearchParams({
    geneInputList: uniprotId ?? symbol,
    organism: String(taxId),
    targetOrganism: targets.join(','),
    orthologType: 'all',
  })
  const parsed = parseMatches(
    await fetchJson(`${PANTHER}/ortholog/matchortho?${params}`),
  )
  if (parsed.unmapped) {
    throw new Error(`PANTHER has no entry for ${symbol} in ${query.longName}`)
  }
  const queryAccession = uniprotId ?? parsed.queryAccession
  if (!queryAccession) {
    throw new Error(`PANTHER lists no orthologs for ${symbol}`)
  }
  const rank = new Map(targets.map((t, i) => [t, i]))
  const picks = pickOnePerGenome(parsed.hits)
    .map(hit => ({ hit, genome: byCode.get(hit.code) }))
    .filter(
      (p): p is { hit: PantherHit; genome: PantherGenome } =>
        !!p.genome && rank.has(p.genome.taxId),
    )
    .sort((a, b) => rank.get(a.genome.taxId)! - rank.get(b.genome.taxId)!)

  const sequences = await fetchSequences([
    queryAccession,
    ...picks.map(p => p.hit.accession),
  ])
  const rows = [
    { label: query.name, taxId, accession: queryAccession },
    ...picks.map(p => ({
      label: p.genome.name,
      taxId: p.genome.taxId,
      accession: p.hit.accession,
    })),
  ]
  return rows.flatMap(row => {
    const sequence = sequences.get(row.accession)
    return sequence ? [{ ...row, sequence }] : []
  })
}

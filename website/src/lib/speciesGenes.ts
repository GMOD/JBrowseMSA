// Multi-species gene resolution for the gene explorer. The human path
// (geneExplorer.ts) is bespoke — mygene.info + a hosted 100-way alignment keyed
// by human symbol — but every other species is synthesized live from public
// APIs, with no per-gene data to host:
//
//  - NCBI Datasets : gene symbol + taxon -> GeneID, assembly, locus, strand,
//                    Swiss-Prot accession
//  - NCBI E-utils  : the `gene_table` flat file -> genomic exon/CDS structure of
//                    the canonical transcript (parsed here)
//  - jb2hubs       : the JBrowse config genomes.jbrowse.org publishes for every
//                    UCSC GenArk assembly — genome, NCBI gene tracks, and the
//                    msaview + protein3d plugins — so a session is config + views
//  - UniProt       : gene -> Swiss-Prot accession when NCBI omits it (common for
//                    invertebrates), so the AlphaFold 3D view still resolves
//
// NCBI names sequences by accession (NC_000077.7); the jb2hubs assembly makes
// the UCSC name (chr11) canonical through its chromAlias adapter. The session
// has to use the canonical name — displayed-region matching does not resolve
// aliases — so the locus is renamed through the same chromAlias file.

import type { CDS, Transcript } from './geneExplorer'

export const DATASETS = 'https://api.ncbi.nlm.nih.gov/datasets/v2'
export const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const UNIPROT = 'https://rest.uniprot.org/uniprotkb'
const JB2HUBS = 'https://jbrowse.org/hubs/genark'

// Which precomputed ortholog set the msaview plugin aligns from. NCBI's sets
// cover vertebrates and insects, so a fly gene finds only insects and a yeast,
// worm or plant gene nothing; PANTHER's span its reference proteomes from human
// to Arabidopsis. `ncbi` when omitted.
export type OrthologSetSource = 'ncbi' | 'panther'

export interface Species {
  taxId: number
  label: string
  scientificName: string
  // true for human, which uses geneExplorer.ts's hg38 + 100-way fast path; the
  // rest go through this module.
  humanFastPath?: boolean
  orthologSource?: OrthologSetSource
}

// Human first (its own fast path); the rest span vertebrate model organisms down
// to an invertebrate, plant, fungus, so the tooling visibly generalizes. Every
// one of these resolves against a GenArk assembly with a jb2hubs config.
export const SPECIES: Species[] = [
  {
    taxId: 9606,
    label: 'Human',
    scientificName: 'Homo sapiens',
    humanFastPath: true,
  },
  { taxId: 10090, label: 'Mouse', scientificName: 'Mus musculus' },
  { taxId: 7955, label: 'Zebrafish', scientificName: 'Danio rerio' },
  {
    taxId: 7227,
    label: 'Fruit fly',
    scientificName: 'Drosophila melanogaster',
    orthologSource: 'panther',
  },
  {
    taxId: 6239,
    label: 'C. elegans',
    scientificName: 'Caenorhabditis elegans',
    orthologSource: 'panther',
  },
  {
    taxId: 3702,
    label: 'Arabidopsis',
    scientificName: 'Arabidopsis thaliana',
    orthologSource: 'panther',
  },
  {
    taxId: 559292,
    label: 'Yeast',
    scientificName: 'Saccharomyces cerevisiae',
    orthologSource: 'panther',
  },
]

export const DEFAULT_SPECIES = SPECIES[0]

export function speciesByTaxId(taxId: number): Species | undefined {
  return SPECIES.find(s => s.taxId === taxId)
}

// --- throttled NCBI access ---------------------------------------------------
// NCBI rate-limits anonymous callers to ~3 req/s; a browser burst gets 429'd.
// Serialize every call through one chain with a minimum gap, and retry 429/5xx
// with backoff. Mirrors jb2hubs' ncbiFetch, trimmed to the browser (no API key).

const MIN_GAP_MS = 350
let chain: Promise<unknown> = Promise.resolve()
let lastStart = 0

function afterGap<T>(run: () => Promise<T>): Promise<T> {
  const result = chain.then(async () => {
    const gap = MIN_GAP_MS - (Date.now() - lastStart)
    if (gap > 0) {
      await new Promise(resolve => setTimeout(resolve, gap))
    }
    lastStart = Date.now()
    return run()
  })
  chain = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

async function ncbiFetch(url: string): Promise<Response> {
  return afterGap(async () => {
    let res = await fetch(url)
    let attempt = 0
    while ((res.status === 429 || res.status >= 500) && attempt < 4) {
      attempt += 1
      await new Promise(resolve =>
        setTimeout(resolve, MIN_GAP_MS * 2 ** attempt),
      )
      res = await fetch(url)
    }
    return res
  })
}

export async function ncbiJson<T>(url: string): Promise<T> {
  const res = await ncbiFetch(url)
  if (!res.ok) {
    throw new Error(`NCBI request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function ncbiText(url: string): Promise<string> {
  const res = await ncbiFetch(url)
  if (!res.ok) {
    throw new Error(`NCBI request failed (${res.status})`)
  }
  return res.text()
}

// --- gene resolution ---------------------------------------------------------

export interface SpeciesLocus {
  symbol: string
  geneId: string
  assemblyAccession: string // GCF_000001635.27
  configUrl: string // the jb2hubs config for that assembly
  geneTrackId: string // its NCBI gene track, RefSeq Select where it has one
  refName: string // the assembly's canonical name, e.g. chr11
  start: number // 1-based
  end: number
  strand: 1 | -1
  uniprotId?: string
}

interface DatasetsGeneReport {
  reports?: {
    gene?: {
      gene_id?: string
      symbol?: string
      orientation?: string
      swiss_prot_accessions?: string[]
      annotations?: {
        assembly_accession?: string
        genomic_locations?: {
          genomic_accession_version?: string
          genomic_range?: {
            begin?: string
            end?: string
            orientation?: string
          }
        }[]
      }[]
    }
  }[]
}

interface PlacedAnnotation {
  assemblyAccession: string
  refName: string
  start: number
  end: number
  strand: 1 | -1
}

// Every annotation NCBI places the gene on, in its order. NCBI lists several
// assemblies for some species (two zebrafish builds, say), and not all of them
// have a hosted genome, so the caller tries them in turn.
function placedAnnotations(
  gene: NonNullable<DatasetsGeneReport['reports']>[number]['gene'],
): PlacedAnnotation[] {
  return (gene?.annotations ?? []).flatMap(a => {
    const loc = a.genomic_locations?.find(l => l.genomic_range?.begin)
    const range = loc?.genomic_range
    return a.assembly_accession && loc?.genomic_accession_version && range
      ? [
          {
            assemblyAccession: a.assembly_accession,
            refName: loc.genomic_accession_version,
            start: Number(range.begin),
            end: Number(range.end),
            strand:
              range.orientation === 'minus' ? (-1 as const) : (1 as const),
          },
        ]
      : []
  })
}

// Gene symbol + taxon -> locus on the first NCBI assembly jb2hubs hosts, named
// the way that assembly's config names its sequences. Swiss-Prot is best-effort
// here; the caller fills it in from UniProt when NCBI omits it.
export async function resolveGeneNcbi(
  symbol: string,
  taxId: number,
): Promise<SpeciesLocus> {
  const json = await ncbiJson<DatasetsGeneReport>(
    `${DATASETS}/gene/symbol/${encodeURIComponent(symbol)}/taxon/${taxId}`,
  )
  const gene = json.reports?.[0]?.gene
  const placed = placedAnnotations(gene)
  if (!gene?.gene_id || placed.length === 0) {
    throw new Error(`No placed locus found for "${symbol}" in taxon ${taxId}`)
  }
  for (const hit of placed) {
    const hub = await fetchGenArkHub(hit.assemblyAccession)
    if (hub) {
      return {
        symbol: gene.symbol ?? symbol,
        geneId: gene.gene_id,
        assemblyAccession: hit.assemblyAccession,
        configUrl: hub.configUrl,
        geneTrackId: hub.geneTrackId,
        refName: hub.canonicalRefName(hit.refName),
        start: hit.start,
        end: hit.end,
        strand: hit.strand,
        uniprotId: gene.swiss_prot_accessions?.[0],
      }
    }
  }
  throw new Error(
    `No hosted genome for "${symbol}": NCBI places it on ${placed.map(p => p.assemblyAccession).join(', ')}, none of which jb2hubs serves`,
  )
}

// Reviewed (Swiss-Prot) accession for a gene, used when NCBI's Datasets record
// omits swiss_prot_accessions (frequent for invertebrates, plants, fungi) so the
// AlphaFold 3D view still has an accession to load. Best-effort: any failure just
// means no structure.
export async function fetchUniProtAccession(
  symbol: string,
  taxId: number,
): Promise<string | undefined> {
  const query = encodeURIComponent(
    `gene:${symbol} AND organism_id:${taxId} AND reviewed:true`,
  )
  const res = await fetch(
    `${UNIPROT}/search?query=${query}&fields=accession&format=json&size=1`,
  ).catch(() => undefined)
  const json = res?.ok
    ? ((await res.json()) as { results?: { primaryAccession?: string }[] })
    : undefined
  return json?.results?.[0]?.primaryAccession
}

// --- gene_table parsing ------------------------------------------------------
// The `efetch db=gene rettype=gene_table` flat file lists, per transcript
// variant, an exon table with columns:
//   Genomic Interval Exon | Genomic Interval Coding | Gene Interval Exon |
//   Gene Interval Coding | Exon Length | Coding Length | Intron Length
// The "Genomic Interval Coding" column gives each CDS exon's genomic coordinates
// directly (1-based inclusive) — everything the collapsed-intron view needs.

export interface ParsedTranscript {
  mrna: string
  protein: string
  aaLength: number
  cds: CDS[] // genomic ascending, interbase
}

// Parse "a-b" as {start,end} with start <= end. Minus-strand rows list the
// interval high-to-low (e.g. 6932840-6931519), so normalize to genomic ascending.
function parseInterval(
  token: string,
): { start: number; end: number } | undefined {
  const m = /^(\d+)-(\d+)$/.exec(token)
  return m
    ? {
        start: Math.min(Number(m[1]), Number(m[2])),
        end: Math.max(Number(m[1]), Number(m[2])),
      }
    : undefined
}

// A row's coding interval is its second genomic interval when that interval sits
// inside the first (the exon interval). UTR-only rows carry a "gene interval"
// token there instead, which falls outside the genomic exon and is skipped.
// Curated + predicted rows share this shape.
function codingFromRow(
  line: string,
): { start: number; end: number } | undefined {
  const tokens = line.split(/\t+/).map(t => t.trim())
  const exon = parseInterval(tokens[0] ?? '')
  const second = parseInterval(tokens[1] ?? '')
  return exon && second && second.start >= exon.start && second.end <= exon.end
    ? second
    : undefined
}

// Phase per CDS in translation order: how many bases of the previous codon spill
// into this exon (GFF3 phase). A complete CDS starts in frame, so the running
// coding length before an exon fixes its phase.
function assignPhases(
  cds: { start: number; end: number }[],
  strand: 1 | -1,
): CDS[] {
  const inTranslationOrder = strand === 1 ? cds : [...cds].reverse()
  let coded = 0
  const phased = inTranslationOrder.map(c => {
    const phase = (3 - (coded % 3)) % 3
    coded += c.end - c.start
    return { ...c, phase }
  })
  // back to genomic ascending, which the Transcript model expects
  return strand === 1 ? phased : phased.reverse()
}

// Split the flat file into per-transcript blocks and parse each variant's coding
// exons. Blocks are keyed by their "Exon table for  mRNA  X and protein Y" line.
export function parseGeneTableBlocks(
  text: string,
  strand: 1 | -1,
): ParsedTranscript[] {
  const out: ParsedTranscript[] = []
  const blocks = text.split(/\nExon table for /).slice(1)
  for (const block of blocks) {
    const header = /mRNA\s+(\S+)\s+and protein\s+(\S+)/.exec(block)
    if (header) {
      const lines = block.split('\n')
      const rows = lines.filter(l => /^\d+-\d+/.test(l.trim()))
      const coding = rows
        .map(codingFromRow)
        .filter((c): c is { start: number; end: number } => !!c)
        .map(c => ({ start: c.start - 1, end: c.end }))
        .sort((a, b) => a.start - b.start)
      if (coding.length > 0) {
        const aa = coding.reduce((n, c) => n + (c.end - c.start), 0) / 3
        out.push({
          mrna: header[1],
          protein: header[2],
          aaLength: Math.round(aa),
          cds: assignPhases(coding, strand),
        })
      }
    }
  }
  return out
}

// Canonical transcript: prefer curated RefSeq (NM_/NR_) over predicted (XM_/XR_),
// then the isoform whose length matches the UniProt canonical protein (so the 3D
// view aligns cleanly), else the longest coding model.
function pickCanonical(
  transcripts: ParsedTranscript[],
  uniprotLength: number | undefined,
): ParsedTranscript | undefined {
  // curated RefSeq mRNAs are NM_/NR_; predicted models are XM_/XR_
  const curated = transcripts.filter(t => /^N[MR]_/.test(t.mrna))
  const pool = curated.length > 0 ? curated : transcripts
  const matched =
    uniprotLength === undefined
      ? undefined
      : pool.find(t => t.aaLength === uniprotLength)
  return matched ?? [...pool].sort((a, b) => b.aaLength - a.aaLength)[0]
}

// The gene_table flat file for a gene. Fetched separately from the pick so it
// can run while the UniProt lookups are in flight.
export function fetchGeneTable(geneId: string): Promise<string> {
  return ncbiText(
    `${EUTILS}/efetch.fcgi?db=gene&id=${geneId}&rettype=gene_table&retmode=text`,
  )
}

// The canonical transcript's genomic CDS model, parsed from the gene_table.
// uniprotLength, when known, steers which isoform we pick.
export function transcriptFromGeneTable(
  text: string,
  locus: SpeciesLocus,
  uniprotLength: number | undefined,
): Transcript {
  const transcript = pickCanonical(
    parseGeneTableBlocks(text, locus.strand),
    uniprotLength,
  )
  if (!transcript) {
    throw new Error(`No coding transcript in gene_table for ${locus.symbol}`)
  }
  return {
    refName: locus.refName,
    strand: locus.strand,
    name: transcript.mrna,
    geneName: locus.symbol,
    cds: transcript.cds,
  }
}

// --- GenArk / jb2hubs --------------------------------------------------------
// jb2hubs shards its configs by triplets of the numeric accession, the way
// hgdownload lays GenArk hubs out: GCF_000001635.27 ->
// GCF/000/001/635/GCF_000001635.27.
export function genArkConfigUrl(accession: string): string {
  const prefix = accession.slice(0, 3) // GCA | GCF
  const digits = accession.slice(4).replace(/\..*$/, '') // 000001635
  return `${JB2HUBS}/${prefix}/${digits.slice(0, 3)}/${digits.slice(3, 6)}/${digits.slice(6, 9)}/${accession}/config.json`
}

// The NCBI gene track a jb2hubs config carries, best first: RefSeq Select is
// one transcript per gene, the rest widen from there. Not every assembly has
// every one (fly and worm have no Select track).
const GENE_TRACK_SUFFIXES = [
  'ncbiRefSeqSelect',
  'ncbiRefSeqCurated',
  'ncbiRefSeq',
  'ncbiGff',
]

export function pickGeneTrack(
  accession: string,
  trackIds: string[],
): string | undefined {
  return GENE_TRACK_SUFFIXES.map(s => `${accession}-${s}`).find(id =>
    trackIds.includes(id),
  )
}

// chromAlias.txt: a header naming each column's naming scheme, then one row per
// sequence. The column the config's RefNameAliasAdapter names is canonical;
// every other column is an alias of it.
export function parseChromAlias(
  text: string,
  canonicalColumn: string,
): Map<string, string> {
  const [header, ...rows] = text.trim().split('\n')
  const columns = header.replace(/^#\s*/, '').split('\t')
  const canonicalIdx = columns.indexOf(canonicalColumn)
  if (canonicalIdx < 0) {
    throw new Error(`chromAlias has no "${canonicalColumn}" column`)
  }
  const map = new Map<string, string>()
  for (const row of rows) {
    const cells = row.split('\t')
    const canonical = cells[canonicalIdx]
    if (canonical) {
      for (const cell of cells) {
        if (cell) {
          map.set(cell, canonical)
        }
      }
    }
  }
  return map
}

export interface GenArkHub {
  configUrl: string
  geneTrackId: string
  canonicalRefName: (refName: string) => string
}

interface HubConfig {
  assemblies?: {
    refNameAliases?: {
      adapter?: { refNameColumnHeaderName?: string; uri?: string }
    }
  }[]
  tracks?: { trackId: string }[]
}

const hubs = new Map<string, Promise<GenArkHub | undefined>>()

// The jb2hubs config for an assembly, reduced to what a session needs, or
// undefined when jb2hubs has none. Memoized per accession; a failed fetch is
// dropped from the memo so a later gene retries.
export function fetchGenArkHub(
  accession: string,
): Promise<GenArkHub | undefined> {
  let hub = hubs.get(accession)
  if (!hub) {
    hub = loadGenArkHub(accession).catch((e: unknown) => {
      hubs.delete(accession)
      throw e
    })
    hubs.set(accession, hub)
  }
  return hub
}

async function loadGenArkHub(
  accession: string,
): Promise<GenArkHub | undefined> {
  const configUrl = genArkConfigUrl(accession)
  const res = await fetch(configUrl)
  if (res.status === 404) {
    return undefined
  }
  if (!res.ok) {
    throw new Error(`jb2hubs config request failed (${res.status})`)
  }
  const config = (await res.json()) as HubConfig
  const geneTrackId = pickGeneTrack(
    accession,
    (config.tracks ?? []).map(t => t.trackId),
  )
  if (!geneTrackId) {
    throw new Error(`jb2hubs config for ${accession} has no NCBI gene track`)
  }
  const aliases = config.assemblies?.[0]?.refNameAliases?.adapter
  const column = aliases?.refNameColumnHeaderName
  const aliasUri = aliases?.uri
  const aliasMap =
    column && aliasUri
      ? parseChromAlias(await (await fetch(aliasUri)).text(), column)
      : new Map<string, string>()
  return {
    configUrl,
    geneTrackId,
    canonicalRefName: refName => aliasMap.get(refName) ?? refName,
  }
}

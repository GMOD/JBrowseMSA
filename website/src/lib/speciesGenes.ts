// Multi-species gene resolution for the gene explorer. The human path
// (geneExplorer.ts) is bespoke — mygene.info + a hosted 100-way alignment keyed
// by human symbol — but every other species is synthesized live from public
// APIs, with no per-gene data to host:
//
//  - NCBI Datasets : gene symbol + taxon -> GeneID, assembly, locus, strand,
//                    Swiss-Prot accession
//  - NCBI E-utils  : the `gene_table` flat file -> genomic exon/CDS structure of
//                    the canonical transcript (parsed here)
//  - genomes.jbrowse.org / UCSC GenArk : the assembly's 2bit, embedded straight
//                    into the JBrowse session so no config change is needed
//  - UniProt       : gene -> Swiss-Prot accession when NCBI omits it (common for
//                    invertebrates), so the AlphaFold 3D view still resolves
//
// The refNames NCBI reports (e.g. NC_000077.7) are exactly the sequence names
// the GenArk 2bit uses, so — unlike hg38's chr aliasing — no canonicalization is
// needed for the LGV loc or connectedFeature to line up.

import type { CDS, Transcript } from './geneExplorer'

export const DATASETS = 'https://api.ncbi.nlm.nih.gov/datasets/v2'
export const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const UNIPROT = 'https://rest.uniprot.org/uniprotkb'
const GENARK = 'https://hgdownload.soe.ucsc.edu/hubs'

export interface Species {
  taxId: number
  label: string
  scientificName: string
  // true for human, which uses geneExplorer.ts's hg38 + 100-way fast path; the
  // rest go through this module.
  humanFastPath?: boolean
}

// Human first (its own fast path); the rest span vertebrate model organisms down
// to an invertebrate, plant, fungus, so the tooling visibly generalizes. Every
// one of these resolves against a GenArk assembly hosted on genomes.jbrowse.org.
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
  },
  {
    taxId: 6239,
    label: 'C. elegans',
    scientificName: 'Caenorhabditis elegans',
  },
  { taxId: 3702, label: 'Arabidopsis', scientificName: 'Arabidopsis thaliana' },
  { taxId: 559292, label: 'Yeast', scientificName: 'Saccharomyces cerevisiae' },
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
  refName: string // NC_000077.7 — matches the GenArk 2bit's sequence names
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

// First annotation carrying a placed genomic range. NCBI can list several
// assemblies; we take the one it reports coordinates against, since that is the
// coordinate space the exon/CDS structure and the GenArk 2bit share.
function pickAnnotation(
  gene: NonNullable<DatasetsGeneReport['reports']>[number]['gene'],
) {
  return gene?.annotations
    ?.map(a => ({
      a,
      loc: a.genomic_locations?.find(l => l.genomic_range?.begin),
    }))
    .find(({ loc }) => loc)
}

// Gene symbol + taxon -> locus. Swiss-Prot is best-effort here; the caller fills
// it in from UniProt when NCBI omits it.
export async function resolveGeneNcbi(
  symbol: string,
  taxId: number,
): Promise<SpeciesLocus> {
  const json = await ncbiJson<DatasetsGeneReport>(
    `${DATASETS}/gene/symbol/${encodeURIComponent(symbol)}/taxon/${taxId}`,
  )
  const gene = json.reports?.[0]?.gene
  const hit = pickAnnotation(gene)
  if (!gene?.gene_id || !hit?.loc?.genomic_range?.begin) {
    throw new Error(`No placed locus found for "${symbol}" in taxon ${taxId}`)
  }
  const range = hit.loc.genomic_range
  const assemblyAccession = hit.a.assembly_accession
  const refName = hit.loc.genomic_accession_version
  if (!assemblyAccession || !refName) {
    throw new Error(
      `NCBI places "${symbol}" on no named assembly/sequence, so there is no genome to show it on`,
    )
  }
  return {
    symbol: gene.symbol ?? symbol,
    geneId: gene.gene_id,
    assemblyAccession,
    refName,
    start: Number(range.begin),
    end: Number(range.end),
    strand: range.orientation === 'minus' ? -1 : 1,
    uniprotId: gene.swiss_prot_accessions?.[0],
  }
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
  const json: unknown = res?.ok ? await res.json() : undefined
  return firstAccession(json)
}

function firstAccession(json: unknown): string | undefined {
  const results =
    typeof json === 'object' && json !== null && 'results' in json
      ? (json as { results: unknown[] }).results
      : []
  const first = results[0]
  return typeof first === 'object' &&
    first !== null &&
    'primaryAccession' in first &&
    typeof first.primaryAccession === 'string'
    ? first.primaryAccession
    : undefined
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

// The canonical transcript's genomic exon/CDS model, parsed from the gene_table.
// uniprotLength, when known, steers which isoform we pick.
export async function fetchTranscriptNcbi(
  locus: SpeciesLocus,
  uniprotLength: number | undefined,
): Promise<Transcript> {
  const text = await ncbiText(
    `${EUTILS}/efetch.fcgi?db=gene&id=${locus.geneId}&rettype=gene_table&retmode=text`,
  )
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

// --- GenArk assembly ---------------------------------------------------------
// hgdownload lays GenArk hubs out by triplets of the numeric accession:
// GCF_000001635.27 -> hubs/GCF/000/001/635/GCF_000001635.27/GCF_000001635.27.*
export function genArkBase(accession: string): string {
  const prefix = accession.slice(0, 3) // GCA | GCF
  const digits = accession.slice(4).replace(/\..*$/, '') // 000001635
  const [p1, p2, p3] = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
  ]
  return `${GENARK}/${prefix}/${p1}/${p2}/${p3}/${accession}/${accession}`
}

// A JBrowse assembly definition embedded straight into the session (via
// sessionAssemblies), so the LGV can display a GenArk genome the hosted config
// never defined. The 2bit + chrom.sizes live on hgdownload.
export function genArkAssembly(accession: string) {
  const base = genArkBase(accession)
  return {
    name: accession,
    sequence: {
      type: 'ReferenceSequenceTrack',
      trackId: `${accession}-refseq`,
      adapter: {
        type: 'TwoBitAdapter',
        uri: `${base}.2bit`,
        chromSizes: `${base}.chrom.sizes`,
      },
    },
  }
}

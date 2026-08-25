import { BgzfFilehandle } from '@gmod/bgzf-filehandle'
import { TabixIndexedFile } from '@gmod/tabix'
import { mergeIntervals, toUrlSafeB64 } from '@jbrowse/core/util'
import { RemoteFile } from 'generic-filehandle2'
import { parseGFF } from 'msa-parsers'

import {
  DEFAULT_SPECIES,
  fetchGeneTable,
  fetchUniProtAccession,
  resolveGeneNcbi,
  transcriptFromGeneTable,
} from './speciesGenes'

import type { Species } from './speciesGenes'
import type { GFFRecord } from 'msa-parsers'

// Everything here is fetched live from CORS-enabled public services, so the
// demo works for any gene with no per-gene data to host:
//
//  - mygene.info  : gene symbol -> locus + UniProt accession (+ type-ahead for
//                   every species)
//  - the `.cds` sidecar of the hosted 100-way alignment: the knownCanonical
//    transcript's coding-exon model (human), the same transcript the alignment
//    is built from, so genome<->MSA<->structure share one coordinate space
//  - RefSeq Select: the fallback transcript model for human genes outside the
//    100-way set, pulled by locus with tabix and parsed in the browser
//  - NCBI Datasets + E-utils + jb2hubs: locus, transcript and genome config for
//    the other species (see speciesGenes); their alignment is built from NCBI
//    orthologs by jbrowse-plugin-msaview when the session opens
//  - AlphaFold    : the 3D structure, by UniProt accession
//
// Only the 100-way alignment needs a hosted file (it is a slice of a
// genome-scale alignment) — see MSA_* / scripts/gene-explorer.

const MYGENE = 'https://mygene.info/v3'

// Canonical (MANE / RefSeq Select) transcripts — one per gene, the same set as
// the hg38-ncbiRefSeqSelect genome track, so codons line up with the alignment.
const REFSEQ_SELECT_GFF =
  'https://jbrowse.org/ucsc/hg38/ncbiRefSeqSelect.gff.gz'

const DATA_BASE = 'https://gmod.org/JBrowseMSA/demo/data'

// One bgzip `.fa.gz` of per-transcript FASTA blocks (hg38 + 99 vertebrates),
// built by scripts/gene-explorer/build-data.mjs from the UCSC knownCanonical
// 100-way exon-AA. Its bgzip index (`.gzi`) and name index (`.idx`) are found by
// suffix. A gene's whole alignment is one random read, keyed by GENE SYMBOL —
// the same symbol resolved from mygene.info, unique per gene — so no
// coordinates / overlap matching is needed.
const MSA_BASE = 'https://jbrowse.org/demos/msaview/100way'
const MSA_GZ = `${MSA_BASE}/hg38.knownCanonical.multiz100way.aa.fa.gz`
export const TREE_URI = `${MSA_BASE}/hg38.multiz100way.nh`

// The JBrowse build + config that bundle jbrowse-plugin-msaview and
// jbrowse-plugin-protein3d (see scripts/gene-explorer/config additions).
const JBROWSE = 'https://jbrowse.org/code/jb2/main/'
const JBROWSE_CONFIG = `${DATA_BASE}/jbrowse-msa-combined-config.json`
const GENE_TRACK = 'hg38-ncbiRefSeqSelect'
export const CONSERVATION_TRACK = 'hg38-multiz470way'
// Genes with a `hg38-<symbol>-clinvar-pathogenic` VariantTrack in the combined
// config; geneExplorer.test.ts checks this list against the config file.
const CLINVAR_GENES = new Set(['TP53', 'BRAF'])

// The per-gene ClinVar track when the config carries one.
export function clinvarTrack(symbol: string) {
  return CLINVAR_GENES.has(symbol)
    ? `hg38-${symbol.toLowerCase()}-clinvar-pathogenic`
    : undefined
}

const alphafoldCif = (uniprotId: string) =>
  `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`

export interface CDS {
  start: number // 0-based interbase
  end: number
  phase: number
}

export interface GeneLocus {
  symbol: string
  refName: string // as the RefSeq Select GFF names it, e.g. chr17
  start: number // 1-based
  end: number
  uniprotId?: string
  geneId?: string // NCBI GeneID
}

// A coding-only transcript model: the collapsed view shows the CDS exons, which
// are the exons the protein/MSA views align to. refName is the assembly's
// canonical name — the one the session must use — so hg38's "17", not "chr17".
export interface Transcript {
  refName: string
  strand: 1 | -1
  name: string // RefSeq mRNA accession, e.g. NM_000546.6
  geneName: string
  cds: CDS[] // genomic ascending
}

interface MyGeneHit {
  symbol?: string
  entrezgene?: string | number
  genomic_pos?: GenomicPos | GenomicPos[]
  uniprot?: { 'Swiss-Prot'?: string | string[] }
}
interface GenomicPos {
  chr: string
  start: number
  end: number
}

// Type-ahead: gene symbols starting with the typed prefix, in the species.
// mygene.info takes any NCBI taxon id as `species`.
export async function searchGenes(
  query: string,
  species: Species = DEFAULT_SPECIES,
): Promise<string[]> {
  const q = encodeURIComponent(`symbol:${query}*`)
  const url = `${MYGENE}/query?q=${q}&species=${species.taxId}&fields=symbol&size=10`
  const res = await fetch(url)
  const json: unknown = res.ok ? await res.json() : {}
  const hits = isHits(json) ? json.hits : []
  const symbols = hits
    .map(h => (typeof h.symbol === 'string' ? h.symbol : undefined))
    .filter((s): s is string => !!s)
  return [...new Set(symbols)]
}

function isHits(v: unknown): v is { hits: { symbol?: unknown }[] } {
  return (
    typeof v === 'object' && v !== null && 'hits' in v && Array.isArray(v.hits)
  )
}

// Gene symbol -> hg38 locus + UniProt accession. mygene matches the symbol
// case-insensitively and returns the canonical spelling, which is the key the
// hosted indexes use.
async function resolveGene(symbol: string): Promise<GeneLocus> {
  const q = encodeURIComponent(`symbol:${symbol}`)
  const url = `${MYGENE}/query?q=${q}&species=human&fields=symbol,genomic_pos,uniprot,entrezgene`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`mygene.info lookup failed (${res.status})`)
  }
  const json: unknown = await res.json()
  const hit = firstHit(json)
  const pos = hit && pickGenomicPos(hit.genomic_pos)
  if (!hit || !pos) {
    throw new Error(`No hg38 locus found for "${symbol}"`)
  }
  const swiss = hit.uniprot?.['Swiss-Prot']
  return {
    symbol: hit.symbol ?? symbol,
    refName: pos.chr.startsWith('chr') ? pos.chr : `chr${pos.chr}`,
    start: pos.start,
    end: pos.end,
    uniprotId: Array.isArray(swiss) ? swiss[0] : swiss,
    geneId: hit.entrezgene === undefined ? undefined : String(hit.entrezgene),
  }
}

function firstHit(v: unknown): MyGeneHit | undefined {
  return isHits(v) ? (v.hits[0] as MyGeneHit | undefined) : undefined
}

// A gene can map to several scaffolds; keep the primary chr assembly entry.
function pickGenomicPos(pos: MyGeneHit['genomic_pos']) {
  const list = Array.isArray(pos) ? pos : pos ? [pos] : []
  return list.find(p => /^(chr)?(\d+|[XYM])$/.test(p.chr)) ?? list[0]
}

let gffTabix: TabixIndexedFile | undefined
function getGffTabix() {
  gffTabix ??= new TabixIndexedFile({
    filehandle: new RemoteFile(REFSEQ_SELECT_GFF),
    csiFilehandle: new RemoteFile(`${REFSEQ_SELECT_GFF}.csi`),
  })
  return gffTabix
}

// The bgzip alignment, random-read by uncompressed byte offset.
let msaBgzf: BgzfFilehandle | undefined
function getMsaBgzf() {
  msaBgzf ??= new BgzfFilehandle({
    filehandle: new RemoteFile(MSA_GZ),
    gziFilehandle: new RemoteFile(`${MSA_GZ}.gzi`),
  })
  return msaBgzf
}

// Fetch a text sidecar once and parse it into a lookup map, memoizing the
// promise. The memo is cleared if the fetch fails, so a transient error doesn't
// wedge every later lookup on a cached rejected promise; a later call retries.
function memoizedTextIndex<T>(url: string, parse: (text: string) => T) {
  let cached: Promise<T> | undefined
  return () => {
    cached ??= fetch(url)
      .then(res => res.text())
      .then(parse)
      .catch((e: unknown) => {
        cached = undefined
        throw e
      })
    return cached
  }
}

// The name index: gene symbol -> {offset,length} into the uncompressed bgzip
// stream. ~1 MB, fetched once and cached.
const getMsaIndex = memoizedTextIndex(
  `${MSA_GZ}.idx`,
  text =>
    new Map(
      text
        .trim()
        .split('\n')
        .map((line): [string, { offset: number; length: number }] => {
          const [id, offset, length] = line.split('\t')
          return [id, { offset: Number(offset), length: Number(length) }]
        }),
    ),
)

// The knownCanonical CDS model index (`<fa.gz>.cds`): gene symbol -> the hg38
// row's coding exons. Built by scripts/gene-explorer/build-data.mjs from the
// SAME transcript as the alignment, so a feature built from it shares the
// alignment's coordinate space (see fetchGeneCds). ~2 MB, fetched once.
const getCdsIndex = memoizedTextIndex(
  `${MSA_GZ}.cds`,
  text =>
    new Map(
      text
        .trim()
        .split('\n')
        .map((line): [string, Transcript] => {
          const [symbol, name, refName, strand, spec] = line.split('\t')
          const cds = spec.split(',').map((s): CDS => {
            const [start, end, phase] = s.split(':')
            return {
              start: Number(start),
              end: Number(end),
              phase: Number(phase),
            }
          })
          return [
            symbol,
            {
              refName: hg38RefName(refName),
              strand: strand === '-' ? -1 : 1,
              name,
              geneName: symbol,
              cds,
            },
          ]
        }),
    ),
)

// The knownCanonical transcript model that backs the alignment, keyed by gene
// symbol. Preferred over fetchTranscript (RefSeq Select) so connectedFeature
// shares the alignment's transcript and the genome<->MSA / genome<->3D mappings
// stay coordinate-consistent for every gene.
async function fetchGeneCds(geneName: string): Promise<Transcript | undefined> {
  // an unreachable .cds index is just another "no CDS for this gene" as far as
  // the caller is concerned (it falls back to RefSeq Select either way), so
  // collapse the network failure into the undefined the return type already
  // allows. getCdsIndex clears its memo on failure, so a later pick retries.
  const index = await getCdsIndex().catch(() => undefined)
  return index?.get(geneName)
}

async function tabixLines(
  file: TabixIndexedFile,
  refName: string,
  start: number,
  end: number,
) {
  const lines: string[] = []
  await file.getLines(refName, start, end, {
    lineCallback: line => {
      lines.push(line)
    },
  })
  return lines
}

function attr(r: GFFRecord, key: string) {
  const v = r[key]
  return typeof v === 'string' ? v : undefined
}

// Pull the canonical transcript's CDS structure live from the RefSeq Select GFF
// and parse it in the browser.
async function fetchTranscript(locus: GeneLocus): Promise<Transcript> {
  const lines = await tabixLines(
    getGffTabix(),
    locus.refName,
    locus.start - 1,
    locus.end,
  )
  const records = parseGFF(lines.join('\n'))
  const transcripts = records.filter(
    r => r.type === 'transcript' || r.type === 'mRNA',
  )
  // RefSeq Select carries the symbol as gene_id; fall back to gene_name, then to
  // the only transcript in the window (handles symbol/synonym mismatches)
  const mrna =
    transcripts.find(
      r =>
        attr(r, 'gene_id') === locus.symbol ||
        attr(r, 'gene_name') === locus.symbol,
    ) ?? transcripts.at(0)
  if (!mrna) {
    throw new Error(`No RefSeq Select transcript near ${locus.symbol}`)
  }
  const txId = attr(mrna, 'transcript_id')
  const cds = records
    .filter(r => attr(r, 'transcript_id') === txId && r.type === 'CDS')
    .map(r => ({ start: r.start - 1, end: r.end, phase: Number(r.phase) || 0 }))
    .sort((a, b) => a.start - b.start)
  if (!txId || cds.length === 0) {
    throw new Error(`Incomplete transcript model for ${locus.symbol}`)
  }
  return {
    refName: hg38RefName(locus.refName),
    strand: mrna.strand === '-' ? -1 : 1,
    name: txId,
    geneName: locus.symbol,
    cds,
  }
}

// Best transcript model for a gene: the alignment-backing knownCanonical CDS
// when available (so connectedFeature shares the alignment's coordinate space),
// else the live RefSeq Select transcript for genes outside the 100-way set.
async function fetchGeneTranscript(locus: GeneLocus): Promise<Transcript> {
  return (await fetchGeneCds(locus.symbol)) ?? fetchTranscript(locus)
}

// bp of context shown on either side of every exon in the collapsed view, so
// the splice boundaries aren't flush against the region edge.
export const DEFAULT_WINDOW_SIZE = 40

export interface CollapseOptions {
  // false shows the whole gene (introns intact) as a single region
  collapse?: boolean
  // bp of padding added around each exon before merging (collapsed view only)
  padding?: number
  // reverse the regions so a minus-strand gene reads 5'→3' left to right
  flip?: boolean
}

// Expand each CDS by `padding` on both sides, then merge any intervals that now
// overlap. The padding is already baked into start/end, so the merge takes no
// extra gap allowance and an intron stays collapsed only when its gap exceeds
// 2*padding — the same call jbrowse-components' buildCollapsedRegions makes.
function paddedMergedCds(transcript: Transcript, padding: number) {
  return mergeIntervals(
    transcript.cds.map(c => ({
      start: Math.max(0, c.start - padding),
      end: c.end + padding,
    })),
    0,
  )
}

// hg38's sequence (and so its canonical refNames) is "1,2,…,X,Y" — "chr17" is
// only an alias. Everything we put in the JBrowse session (the LGV `loc` →
// displayedRegions, and the connectedFeature) must use the canonical name:
// refName matching against displayed regions (bpToPx, hover/click highlights,
// centerAt) is exact and does NOT alias-resolve, so an aliased displayed region
// silently breaks those. mygene and the sidecar name the "chr17" form, so the
// human loaders rename at the source.
function hg38RefName(refName: string) {
  return refName.replace(/^chr/, '')
}

// A space-separated list of locstrings. When collapsing, each padded/merged CDS
// becomes one displayedRegion in the LinearGenomeView (via JBrowse's
// navToLocations), so the introns between them squeeze out — there is no
// `collapseIntrons` view option, this IS how you build a collapsed view
// declaratively. When not collapsing, a single region spans the whole CDS.
// Flipping lists the regions last-to-first with core's `[rev]` suffix on each,
// which is how the CollapseIntronsDialog makes a minus-strand gene read 5'→3'.
// Locstrings are 1-based.
export function collapsedLoc(
  transcript: Transcript,
  {
    collapse = true,
    padding = DEFAULT_WINDOW_SIZE,
    flip = false,
  }: CollapseOptions = {},
) {
  const { refName } = transcript
  const regions = collapse
    ? paddedMergedCds(transcript, padding)
    : [cdsBounds(transcript)]
  const suffix = flip ? '[rev]' : ''
  const locs = regions.map(r => `${refName}:${r.start + 1}-${r.end}${suffix}`)
  return (flip ? locs.reverse() : locs).join(' ')
}

// Genomic extent of the coding model (min start, max end).
function cdsBounds(transcript: Transcript) {
  return {
    start: Math.min(...transcript.cds.map(c => c.start)),
    end: Math.max(...transcript.cds.map(c => c.end)),
  }
}

export interface GeneStats {
  codingBp: number // total CDS length
  span: number // genomic distance the CDS spans (introns included)
  ratio: string // span / codingBp, i.e. how much the collapsed view squeezes out
}

// The coding-model summary shown in the result panel.
export function geneStats(transcript: Transcript): GeneStats {
  const codingBp = transcript.cds.reduce((sum, c) => sum + (c.end - c.start), 0)
  const { start, end } = cdsBounds(transcript)
  const span = end - start
  return { codingBp, span, ratio: (span / codingBp).toFixed(1) }
}

// The transcript model the MsaView and ProteinView use to map a residue to its
// codon (and back). 0-based interbase coordinates, CDS subfeatures only.
export function connectedFeature(transcript: Transcript) {
  const { start, end } = cdsBounds(transcript)
  return {
    uniqueId: transcript.name,
    type: 'mRNA',
    refName: transcript.refName,
    start,
    end,
    strand: transcript.strand,
    name: transcript.name,
    subfeatures: transcript.cds.map(c => ({
      type: 'CDS',
      start: c.start,
      end: c.end,
      strand: transcript.strand,
      phase: c.phase,
    })),
  }
}

export interface GeneMsa {
  fasta: string
  querySeqName: string
  // the human (hg38) row, ungapped — the protein the ProteinView/AlphaFold needs
  querySequence: string
  rowCount: number
}

// Fetch one transcript's 100-way alignment from the indexed bgzip file: look up
// the gene symbol in the name index, random-read its FASTA block, and return it
// as-is — the block is already valid FASTA (`>hg38\nSEQ\n>panTro4\nSEQ\n...`,
// hg38 first).
async function fetchGeneMsa(geneName: string): Promise<GeneMsa | undefined> {
  // the alignment slice is hosted separately and is optional; an unreachable
  // index reads as "no MSA for this gene", same as a missing entry
  const index = await getMsaIndex().catch(() => undefined)
  const entry = index?.get(geneName)
  if (!entry) {
    return undefined
  }
  const bytes = await getMsaBgzf().read(entry.length, entry.offset)
  const fasta = new TextDecoder().decode(bytes).trim()
  return {
    fasta,
    querySeqName: 'hg38', // first row is the human reference
    querySequence: firstSequence(fasta),
    rowCount: (fasta.match(/^>/gm) ?? []).length,
  }
}

// The residues of a single FASTA record, with the '>' header line dropped.
function fastaBody(record: string) {
  const [, ...seqLines] = record.trim().split('\n')
  return seqLines.join('')
}

// The first FASTA record's sequence (here hg38), ungapped.
function firstSequence(fasta: string) {
  return fastaBody(fasta.split(/\n>/)[0]).replaceAll('-', '')
}

// The UniProt canonical protein sequence by accession. AlphaFold builds its
// structure from exactly this sequence, so it's the right
// `userProvidedTranscriptSequence` for the 3D<->structure alignment — and it's
// available for any gene with a Swiss-Prot accession, not just the 100-way set.
// Best-effort: a failure just means no 3D view (undefined), never a load error.
async function fetchUniProtSeq(uniprotId: string) {
  const res = await fetch(
    `https://rest.uniprot.org/uniprotkb/${uniprotId}.fasta`,
  ).catch(() => undefined)
  if (!res?.ok) {
    return undefined
  }
  return fastaBody(await res.text())
}

// The genome a session opens on: a hosted JBrowse config, the assembly it
// defines, and the gene track to show under the collapsed exons. Human is the
// app's own hg38 config; every other species is its jb2hubs GenArk config.
export interface Genome {
  configUrl: string
  assemblyName: string
  geneTrackId: string
}

const HG38: Genome = {
  configUrl: JBROWSE_CONFIG,
  assemblyName: 'hg38',
  geneTrackId: GENE_TRACK,
}

export interface GeneResult {
  species: Species
  genome: Genome
  transcript: Transcript
  uniprotId?: string
  // NCBI GeneID — the key the ortholog endpoints take
  geneId?: string
  msa?: GeneMsa
  // the protein AlphaFold aligns to: the aligned hg38 row when in the 100-way
  // set, else the UniProt canonical sequence — so 3D linkage works for any gene
  proteinSequence?: string
}

// Resolve a gene to everything the result panel renders. Human uses the bespoke
// hg38 + 100-way fast path; every other species is synthesized live from NCBI +
// jb2hubs + UniProt (see speciesGenes) and reports each stage through
// onProgress. One entry point so the UI guards staleness once rather than
// around each await.
export async function loadGene(
  symbol: string,
  species: Species = DEFAULT_SPECIES,
  onProgress: (message: string) => void = () => {},
): Promise<GeneResult> {
  return species.humanFastPath
    ? loadHumanGene(symbol)
    : loadSpeciesGene(symbol, species, onProgress)
}

async function loadHumanGene(symbol: string): Promise<GeneResult> {
  const locus = await resolveGene(symbol)
  // independent once the locus is known, and each pulls a separate multi-MB
  // index, so fetch them concurrently rather than one after the other
  const [transcript, msa] = await Promise.all([
    fetchGeneTranscript(locus),
    fetchGeneMsa(locus.symbol),
  ])
  // Prefer the aligned hg38 MSA row: it's the knownCanonical CDS translation, so
  // it shares connectedFeature's codon ordinals. For genes outside the 100-way
  // set fall back to the UniProt sequence so the 3D view still links up.
  const proteinSequence =
    msa?.querySequence ??
    (locus.uniprotId ? await fetchUniProtSeq(locus.uniprotId) : undefined)
  return {
    species: DEFAULT_SPECIES,
    genome: HG38,
    transcript,
    uniprotId: locus.uniprotId,
    geneId: locus.geneId,
    msa,
    proteinSequence,
  }
}

// Non-human: NCBI locus (and the jb2hubs genome that hosts it), then the
// UniProt sequence and the gene_table concurrently — the sequence drives the
// 3D view and steers which isoform the gene_table pick takes.
async function loadSpeciesGene(
  symbol: string,
  species: Species,
  onProgress: (message: string) => void,
): Promise<GeneResult> {
  onProgress(`Resolving ${symbol} at NCBI…`)
  const locus = await resolveGeneNcbi(symbol, species.taxId)
  onProgress('Fetching the protein and transcript model…')
  const geneTable = fetchGeneTable(locus.geneId)
  const uniprotId =
    locus.uniprotId ?? (await fetchUniProtAccession(symbol, species.taxId))
  const proteinSequence = uniprotId
    ? await fetchUniProtSeq(uniprotId)
    : undefined
  const transcript = transcriptFromGeneTable(
    await geneTable,
    locus,
    proteinSequence?.length,
  )
  return {
    species,
    genome: {
      configUrl: locus.configUrl,
      assemblyName: locus.assemblyAccession,
      geneTrackId: locus.geneTrackId,
    },
    transcript,
    uniprotId,
    geneId: locus.geneId,
    proteinSequence,
  }
}

// What jbrowse-plugin-msaview needs to build the alignment itself when the
// session opens: NCBI's orthologs of this gene, aligned at EBI, with the query
// row being the protein the 3D view aligns to.
export interface OrthologSource {
  taxId: number
  geneId: string
  proteinSequence: string
}

export interface SessionOptions {
  genome: Genome
  transcript: Transcript
  uniprotId?: string
  proteinSequence?: string
  // include the connected hosted 100-way MsaView (human only)
  msaAvailable?: boolean
  // include a connected MsaView the plugin fills from NCBI orthologs at launch
  orthologs?: OrthologSource
  // false launches a whole-gene view (introns intact) instead of collapsed exons
  collapseIntrons?: boolean
  // reverse the genome view so a minus-strand gene reads 5'→3'
  flip?: boolean
  // add the 470-way conservation track under the gene (human only)
  conservation?: boolean
}

type Feature = ReturnType<typeof connectedFeature>

// --- view snapshot builders --------------------------------------------------
// Each returns the snapshot the matching LaunchView-* extension point would
// build, so we skip those extension points: the view's own afterAttach autorun
// resolves the `init`/`structures` fields (loc -> displayedRegions, MSA-by-name
// read, AlphaFold load + linking) the same way. See the plugins' DEVELOPERS.md.

// loc/tracks/assembly under `init`: navToLocations expands the space-separated
// collapsed-exon loc into one displayedRegion per exon, squeezing introns out.
// The gene track shows the transcript model under those regions.
function linearGenomeView(
  transcript: Transcript,
  collapse: CollapseOptions,
  genome: Genome,
  tracks: string[],
) {
  return {
    id: `lgv-${transcript.geneName}`,
    type: 'LinearGenomeView',
    colorByCDS: true,
    init: {
      assembly: genome.assemblyName,
      loc: collapsedLoc(transcript, collapse),
      tracks,
    },
  }
}

// The genome's tracks for a gene: its gene model always; on hg38 also the
// ClinVar pathogenic variants when the config has them, and conservation on
// request. The jb2hubs configs carry neither.
function genomeTracks(genome: Genome, symbol: string, conservation: boolean) {
  const hg38 = genome.assemblyName === HG38.assemblyName
  return [
    genome.geneTrackId,
    hg38 ? clinvarTrack(symbol) : undefined,
    hg38 && conservation ? CONSERVATION_TRACK : undefined,
  ].filter((t): t is string => !!t)
}

// Fields every MsaView shares regardless of where its alignment comes from.
// uniprotId lets MsaView.autoConnectStructures link to the AlphaFold structure
// (it derives the same id from the structure's url, so the two match).
function msaViewBase(
  transcript: Transcript,
  feature: Feature,
  uniprotId?: string,
) {
  return {
    id: `msa-${transcript.geneName}`,
    type: 'MsaView',
    connectedViewId: `lgv-${transcript.geneName}`,
    connectedFeature: feature,
    uniprotId,
    colorSchemeName: 'percent_identity_dynamic',
    labelsAlignRight: true,
    treeAreaWidth: 200,
  }
}

// Human: jbrowse-plugin-msaview random-reads this gene's FASTA block from the
// hosted bgzip file by name (the gene symbol); the .gzi/.idx are found by suffix.
function msaViewHosted(
  transcript: Transcript,
  feature: Feature,
  uniprotId?: string,
) {
  return {
    ...msaViewBase(transcript, feature, uniprotId),
    treeFilehandle: { uri: TREE_URI, locationType: 'UriLocation' },
    init: {
      msaIndexedLocation: { uri: MSA_GZ },
      msaName: transcript.geneName,
      querySeqName: 'hg38',
    },
  }
}

// Non-human: the plugin builds the alignment when the view attaches —
// `orthologParams` is its own model property with an autorun (see
// jbrowse-plugin-msaview DEVELOPERS.md), so the session carries the request,
// not the result. The GeneID goes first so no symbol lookup is needed; the
// protein sequence becomes the query row, named `<species>_query` by the
// plugin, which is the row connectedFeature maps genome coordinates through.
// allowedGappyness hides the columns a lone long ortholog would otherwise open
// the view on.
function msaViewOrthologs(
  transcript: Transcript,
  feature: Feature,
  orthologs: OrthologSource,
  uniprotId?: string,
) {
  return {
    ...msaViewBase(transcript, feature, uniprotId),
    allowedGappyness: 80,
    orthologParams: {
      taxId: orthologs.taxId,
      geneCandidates: [orthologs.geneId, transcript.geneName],
      msaAlgorithm: 'clustalo',
      proteinSequence: orthologs.proteinSequence,
    },
  }
}

// CDS strand/phase drive the genome<->residue map; the AlphaFold url's accession
// matches MsaView's uniprotId, so the two views connect.
function proteinView(
  transcript: Transcript,
  feature: Feature,
  uniprotId: string,
  proteinSequence: string,
) {
  return {
    id: `protein-${transcript.geneName}`,
    type: 'ProteinView',
    height: 500,
    zoomToBaseLevel: false,
    structures: [
      {
        url: alphafoldCif(uniprotId),
        feature,
        userProvidedTranscriptSequence: proteinSequence,
        connectedViewId: `lgv-${transcript.geneName}`,
      },
    ],
  }
}

// The workspace tree jbrowse-web restores from a session snapshot
// (app-core's WorkspaceLayoutMixin: a `row` branch of panels, each holding tabs
// of view ids; sizes are weights). Genome + alignment stacked in the left cell,
// the 3D structure in the right. `useWorkspaces` turns the tiled layout on for
// this session without touching the visitor's own preference. Ids only need to
// be unique within the tree; the ones jbrowse mints later are random, so fixed
// names can't collide with them.
function sideBySideLayout(leftIds: string[], rightId: string) {
  return {
    useWorkspaces: true,
    activePanelId: 'panel-left',
    layout: {
      id: 'branch-root',
      direction: 'row' as const,
      size: 1,
      children: [
        {
          id: 'panel-left',
          size: 58,
          tabs: [{ id: 'tab-left', viewIds: leftIds }],
          activeTabId: 'tab-left',
        },
        {
          id: 'panel-right',
          size: 42,
          tabs: [{ id: 'tab-right', viewIds: [rightId] }],
          activeTabId: 'tab-right',
        },
      ],
    },
  }
}

// The JBrowse session snapshot for a gene: a collapsed-intron genome view, plus
// — when an alignment source and structure exist — a connected alignment and
// 3D structure, laid out side by side.
export function buildSession({
  genome,
  transcript,
  uniprotId,
  proteinSequence,
  msaAvailable,
  orthologs,
  collapseIntrons = true,
  flip = false,
  conservation = false,
}: SessionOptions) {
  const feature = connectedFeature(transcript)
  const lgv = linearGenomeView(
    transcript,
    { collapse: collapseIntrons, flip },
    genome,
    genomeTracks(genome, transcript.geneName, conservation),
  )

  // one MSA source at most: the hosted 100-way (human) or an ortholog alignment
  // the plugin builds at launch (non-human)
  const msa = msaAvailable
    ? msaViewHosted(transcript, feature, uniprotId)
    : orthologs
      ? msaViewOrthologs(transcript, feature, orthologs, uniprotId)
      : undefined
  // the 3D view needs only the structure accession + its protein sequence, not
  // the alignment, so it links up for any gene with a UniProt entry
  const protein =
    uniprotId && proteinSequence
      ? proteinView(transcript, feature, uniprotId, proteinSequence)
      : undefined

  return {
    name: `Gene explorer: ${transcript.geneName}`,
    views: [lgv, ...(msa ? [msa] : []), ...(protein ? [protein] : [])],
    ...(protein
      ? sideBySideLayout([lgv.id, ...(msa ? [msa.id] : [])], protein.id)
      : {}),
  }
}

export type Session = ReturnType<typeof buildSession>

// deflate+base64 a full session snapshot into a `#…session=encoded-…` URL,
// with the same encoder jbrowse-web's `encoded-` loader inverts. Two things
// keep the link working for any gene, including titin-scale ones whose plain
// session JSON is >100 KB:
//   - the hash fragment is never sent to the server, so it can't trip the server
//     request-line limit (HTTP 414) the query string did
//   - deflate shrinks the (highly repetitive) JSON ~6x so the URL stays sane
// https://jbrowse.org/jb2/docs/urlparams/
export async function sessionUrl(session: Session, genome: Genome = HG38) {
  const encoded = await toUrlSafeB64(JSON.stringify(session))
  return `${JBROWSE}#config=${encodeURIComponent(genome.configUrl)}&session=encoded-${encoded}`
}

import { BgzfFilehandle } from '@gmod/bgzf-filehandle'
import { TabixIndexedFile } from '@gmod/tabix'
import { RemoteFile } from 'generic-filehandle2'
import { parseGFF } from 'msa-parsers'
import { deflate } from 'pako-esm2'

import {
  DEFAULT_SPECIES,
  fetchTranscriptNcbi,
  fetchUniProtAccession,
  genArkAssembly,
  resolveGeneNcbi,
  searchGenesNcbi,
} from './speciesGenes'

import type { Species } from './speciesGenes'
import type { GFFRecord } from 'msa-parsers'

// Everything here is fetched live from CORS-enabled public services, so the
// demo works for any human gene with no per-gene data to host:
//
//  - mygene.info  : gene symbol -> hg38 locus + UniProt accession (+ type-ahead)
//  - RefSeq Select: the canonical transcript's exon/CDS model, pulled by locus
//    with tabix and parsed in the browser (this is the "parse GFF" step)
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
const TREE_URI = `${MSA_BASE}/hg38.multiz100way.nh`

// The JBrowse build + config that bundle jbrowse-plugin-msaview and
// jbrowse-plugin-protein3d (see scripts/gene-explorer/config additions).
const JBROWSE = 'https://jbrowse.org/code/jb2/webgl-poc/'
const JBROWSE_CONFIG = `${DATA_BASE}/jbrowse-msa-combined-config.json`
const GENE_TRACK = 'hg38-ncbiRefSeqSelect'

const alphafoldCif = (uniprotId: string) =>
  `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`

// Mirrors @jbrowse/core's sessionSharing.toUrlSafeB64 (deflate + url-safe,
// unpadded base64) so jbrowse-web's `encoded-` SessionLoader path inflates it
// back via fromUrlSafeB64. Kept byte-compatible deliberately — this is the one
// contract between the link we emit and the viewer that opens it.
function toUrlSafeB64(str: string) {
  const deflated: Uint8Array = deflate(new TextEncoder().encode(str), undefined)
  const b64 = btoa(Array.from(deflated, b => String.fromCharCode(b)).join(''))
  return b64
    .replace(/=+$/, '') // drop padding
    .replaceAll('+', '-')
    .replaceAll('/', '_')
}

export interface Exon {
  start: number // 0-based interbase
  end: number
}

export interface CDS extends Exon {
  phase: number
}

export interface GeneLocus {
  symbol: string
  refName: string // with chr prefix, e.g. chr17
  start: number // 1-based
  end: number
  uniprotId?: string
}

export interface Transcript {
  refName: string
  strand: 1 | -1
  name: string // RefSeq mRNA accession, e.g. NM_000546.6
  geneName: string
  exons: Exon[] // genomic ascending, full mRNA (incl. UTR)
  cds: CDS[] // genomic ascending, coding only
}

interface MyGeneHit {
  symbol?: string
  genomic_pos?: GenomicPos | GenomicPos[]
  uniprot?: { 'Swiss-Prot'?: string | string[] }
}
interface GenomicPos {
  chr: string
  start: number
  end: number
}

// Type-ahead: gene symbols starting with the typed prefix. Human uses mygene
// (fast); other species use NCBI E-utils (see speciesGenes).
export async function searchGenes(
  query: string,
  species: Species = DEFAULT_SPECIES,
): Promise<string[]> {
  if (!species.humanFastPath) {
    return searchGenesNcbi(query, species.taxId)
  }
  const q = encodeURIComponent(`symbol:${query}*`)
  const url = `${MYGENE}/query?q=${q}&species=human&fields=symbol&size=10`
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

// Gene symbol -> hg38 locus + UniProt accession.
async function resolveGene(symbol: string): Promise<GeneLocus> {
  const q = encodeURIComponent(`symbol:${symbol}`)
  const url = `${MYGENE}/query?q=${q}&species=human&fields=symbol,genomic_pos,uniprot`
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
// wedge every later lookup on a cached rejected promise (the placeholder-forever
// bug); a later call retries.
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
// alignment's coordinate space (see fetchGeneCds). ~5 MB, fetched once.
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
              refName,
              strand: strand === '-' ? -1 : 1,
              name,
              geneName: symbol,
              // coding-only model: the collapsed view shows CDS exons, which
              // is what the protein/MSA views align to
              exons: cds.map(c => ({ start: c.start, end: c.end })),
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

// Pull the canonical transcript's exon/CDS structure live from the RefSeq
// Select GFF and parse it in the browser.
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
  const mine = records.filter(r => attr(r, 'transcript_id') === txId)
  const exons = toBlocks(mine.filter(r => r.type === 'exon'))
  const cds = mine
    .filter(r => r.type === 'CDS')
    .map(r => ({ start: r.start - 1, end: r.end, phase: Number(r.phase) || 0 }))
    .sort((a, b) => a.start - b.start)
  if (!txId || exons.length === 0 || cds.length === 0) {
    throw new Error(`Incomplete transcript model for ${locus.symbol}`)
  }
  return {
    refName: locus.refName,
    strand: mrna.strand === '-' ? -1 : 1,
    name: txId,
    geneName: locus.symbol,
    exons,
    cds,
  }
}

// Best transcript model for a gene: the alignment-backing knownCanonical CDS
// when available (so connectedFeature shares the alignment's coordinate space),
// else the live RefSeq Select transcript for genes outside the 100-way set.
async function fetchGeneTranscript(
  symbol: string,
  locus: GeneLocus,
): Promise<Transcript> {
  return (await fetchGeneCds(symbol)) ?? fetchTranscript(locus)
}

function toBlocks(records: GFFRecord[]): Exon[] {
  return records
    .map(r => ({ start: r.start - 1, end: r.end }))
    .sort((a, b) => a.start - b.start)
}

// bp of context shown on either side of every exon in the collapsed view, so
// the splice boundaries aren't flush against the region edge.
export const DEFAULT_WINDOW_SIZE = 40

export interface CollapseOptions {
  // false shows the whole gene (introns intact) as a single region
  collapse?: boolean
  // bp of padding added around each exon before merging (collapsed view only)
  padding?: number
}

// Expand each exon by `padding` on both sides, then merge any intervals that now
// overlap. The padding is already baked into start/end, so a plain overlap merge
// (no extra gap allowance) leaves an intron collapsed only when its gap exceeds
// 2*padding. Mirrors jbrowse-components' buildCollapsedRegions.
function paddedMergedExons(transcript: Transcript, padding: number): Exon[] {
  const merged: Exon[] = []
  for (const e of [...transcript.exons].sort((a, b) => a.start - b.start)) {
    const start = Math.max(0, e.start - padding)
    const end = e.end + padding
    const last = merged.at(-1)
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end)
    } else {
      merged.push({ start, end })
    }
  }
  return merged
}

// hg38's sequence (and so its canonical refNames) is "1,2,…,X,Y" — "chr17" is
// only an alias. Everything we put in the JBrowse session (the LGV `loc` →
// displayedRegions, and the connectedFeature) must use the canonical name:
// refName matching against displayed regions (bpToPx, hover/click highlights,
// centerAt) is exact and does NOT alias-resolve, so an aliased displayed region
// silently breaks those. We keep the friendly "chr17" for the UI and normalize
// only at the session boundary. (mygene/UCSC give us the "chr"-prefixed form.)
function toCanonicalRefName(refName: string) {
  return refName.replace(/^chr/, '')
}

// A space-separated list of locstrings. When collapsing, each padded/merged exon
// becomes one displayedRegion in the LinearGenomeView (via JBrowse's
// navToLocations), so the introns between them squeeze out — there is no
// `collapseIntrons` view option, this IS how you build a collapsed view
// declaratively. When not collapsing, a single region spans the whole gene.
// Locstrings are 1-based.
export function collapsedLoc(
  transcript: Transcript,
  { collapse = true, padding = DEFAULT_WINDOW_SIZE }: CollapseOptions = {},
) {
  const refName = toCanonicalRefName(transcript.refName)
  if (collapse) {
    return paddedMergedExons(transcript, padding)
      .map(e => `${refName}:${e.start + 1}-${e.end}`)
      .join(' ')
  }
  const { start, end } = blockBounds(transcript.exons)
  return `${refName}:${start + 1}-${end}`
}

// Genomic extent of a set of blocks (min start, max end).
function blockBounds(blocks: Exon[]) {
  return {
    start: Math.min(...blocks.map(b => b.start)),
    end: Math.max(...blocks.map(b => b.end)),
  }
}

export interface GeneStats {
  codingBp: number // total CDS length
  span: number // genomic distance the CDS spans (introns included)
  ratio: string // span / codingBp, i.e. how much the collapsed view squeezes out
}

// The CODING-model summary shown in the result panel. Derived from transcript.cds
// so it means the same thing whether the transcript came from the .cds sidecar or
// the RefSeq Select fallback (transcript.exons differs between the two; cds does
// not).
export function geneStats(transcript: Transcript): GeneStats {
  const codingBp = transcript.cds.reduce((sum, c) => sum + (c.end - c.start), 0)
  const { start, end } = blockBounds(transcript.cds)
  const span = end - start
  return { codingBp, span, ratio: (span / codingBp).toFixed(1) }
}

// The transcript model the MsaView and ProteinView use to map a residue to its
// codon (and back). 0-based interbase coordinates, CDS subfeatures only.
export function connectedFeature(transcript: Transcript) {
  const { start, end } = blockBounds(transcript.cds)
  return {
    uniqueId: transcript.name,
    type: 'mRNA',
    refName: toCanonicalRefName(transcript.refName),
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

export interface GeneResult {
  species: Species
  transcript: Transcript
  uniprotId?: string
  // NCBI GeneID (non-human) — the key the ortholog endpoint needs
  geneId?: string
  msa?: GeneMsa
  // the protein AlphaFold aligns to: the aligned hg38 row when in the 100-way
  // set, else the UniProt canonical sequence — so 3D linkage works for any gene
  proteinSequence?: string
  // GenArk accession to embed as the session assembly; undefined for human,
  // which uses the hosted hg38 config assembly
  assemblyAccession?: string
}

// Resolve a gene to everything the result panel renders. Human uses the bespoke
// hg38 + 100-way fast path; every other species is synthesized live from NCBI +
// GenArk + UniProt (see speciesGenes). One entry point so the UI guards
// staleness once rather than around each await.
export async function loadGene(
  symbol: string,
  species: Species = DEFAULT_SPECIES,
): Promise<GeneResult> {
  return species.humanFastPath
    ? loadHumanGene(symbol)
    : loadSpeciesGene(symbol, species)
}

async function loadHumanGene(symbol: string): Promise<GeneResult> {
  const locus = await resolveGene(symbol)
  // independent once the locus is known, and each pulls a separate multi-MB
  // index, so fetch them concurrently rather than one after the other
  const [transcript, msa] = await Promise.all([
    fetchGeneTranscript(symbol, locus),
    fetchGeneMsa(symbol),
  ])
  // Prefer the aligned hg38 MSA row: it's the knownCanonical CDS translation, so
  // it shares connectedFeature's codon ordinals. For genes outside the 100-way
  // set fall back to the UniProt sequence so the 3D view still links up.
  const proteinSequence =
    msa?.querySequence ??
    (locus.uniprotId ? await fetchUniProtSeq(locus.uniprotId) : undefined)
  return {
    species: DEFAULT_SPECIES,
    transcript,
    uniprotId: locus.uniprotId,
    msa,
    proteinSequence,
  }
}

// Non-human: NCBI locus -> UniProt accession/sequence (steers the isoform pick
// and drives the 3D view) -> the canonical transcript's genomic exon/CDS model.
// No precomputed alignment; the cross-species MSA is built on demand.
async function loadSpeciesGene(
  symbol: string,
  species: Species,
): Promise<GeneResult> {
  const locus = await resolveGeneNcbi(symbol, species.taxId)
  const uniprotId =
    locus.uniprotId ?? (await fetchUniProtAccession(symbol, species.taxId))
  const proteinSequence = uniprotId
    ? await fetchUniProtSeq(uniprotId)
    : undefined
  const transcript = await fetchTranscriptNcbi(locus, proteinSequence?.length)
  return {
    species,
    transcript,
    uniprotId,
    geneId: locus.geneId,
    proteinSequence,
    assemblyAccession: locus.assemblyAccession,
  }
}

export interface InlineMsa {
  fasta: string
  newick: string
  querySeqName: string // the reference row the MSA maps back to the genome through
}

export interface SessionOptions {
  transcript: Transcript
  uniprotId?: string
  proteinSequence?: string
  // include the connected hosted 100-way MsaView (human only)
  msaAvailable?: boolean
  // an alignment computed on the fly (non-human), carried inline in the session
  inlineMsa?: InlineMsa
  // false launches a whole-gene view (introns intact) instead of collapsed exons
  collapseIntrons?: boolean
  // GenArk accession to embed as the session's assembly (non-human); undefined
  // uses the hosted hg38 config assembly
  assemblyAccession?: string
}

type Feature = ReturnType<typeof connectedFeature>

// --- view snapshot builders --------------------------------------------------
// Each returns the snapshot the matching LaunchView-* extension point would
// build, so we skip those extension points: the view's own afterAttach autorun
// resolves the `init`/`structures` fields (loc -> displayedRegions, MSA-by-name
// read, AlphaFold load + linking) the same way. See the plugins' DEVELOPERS.md.

// loc/tracks/assembly under `init`: navToLocations expands the space-separated
// collapsed-exon loc into one displayedRegion per exon, squeezing introns out.
// Human references the hosted hg38 gene track; other species show the collapsed
// regions alone (the connectedFeature carries the codon mapping either way).
function linearGenomeView(
  transcript: Transcript,
  collapseIntrons: boolean,
  assemblyName: string,
  tracks: string[],
) {
  return {
    id: `lgv-${transcript.geneName}`,
    type: 'LinearGenomeView',
    colorByCDS: true,
    init: {
      assembly: assemblyName,
      loc: collapsedLoc(transcript, { collapse: collapseIntrons }),
      tracks,
    },
  }
}

// Fields every MsaView shares regardless of where its alignment comes from.
// uniprotId lets MsaView.autoConnectStructures link to the AlphaFold structure
// (it derives the same id from the structure's url, so the two match).
function msaViewBase(transcript: Transcript, feature: Feature, uniprotId?: string) {
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

// Non-human: an ortholog alignment built on the fly, carried inline in the
// session as MSA + guide tree (no hosted file). querySeqName names the reference
// row the connectedFeature maps genome coordinates through.
function msaViewInline(
  transcript: Transcript,
  feature: Feature,
  inlineMsa: InlineMsa,
  uniprotId?: string,
) {
  return {
    ...msaViewBase(transcript, feature, uniprotId),
    querySeqName: inlineMsa.querySeqName,
    data: { msa: inlineMsa.fasta, tree: inlineMsa.newick },
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

// genome+alignment stacked on the left, the 3D structure on the right (the
// simple viewIds/direction/size form app-core's createInitialPanels consumes).
function sideBySideLayout(leftIds: string[], rightId: string) {
  return {
    direction: 'horizontal' as const,
    children: [
      { viewIds: leftIds, size: 58 },
      { viewIds: [rightId], size: 42 },
    ],
  }
}

// deflate+base64 a full session snapshot into a `#…session=encoded-…` URL. Two
// things keep the link working for any gene, including titin-scale ones whose
// plain session JSON is >100 KB:
//   - the hash fragment is never sent to the server, so it can't trip the server
//     request-line limit (HTTP 414) the query string did
//   - deflate shrinks the (highly repetitive) JSON ~6x so the URL stays sane
// jbrowse-web reads params from the hash and inflates `encoded-` via
// fromUrlSafeB64. https://jbrowse.org/jb2/docs/urlparams/
function encodedSessionUrl(session: unknown) {
  return `${JBROWSE}#config=${encodeURIComponent(JBROWSE_CONFIG)}&session=encoded-${toUrlSafeB64(JSON.stringify(session))}`
}

// Build the JBrowse session URL for a gene: a collapsed-intron genome view, plus
// — when the alignment slice and structure exist — a connected alignment and 3D
// structure, laid out side by side.
export function buildSessionUrl({
  transcript,
  uniprotId,
  proteinSequence,
  msaAvailable,
  inlineMsa,
  collapseIntrons = true,
  assemblyAccession,
}: SessionOptions) {
  const feature = connectedFeature(transcript)
  // human references the hosted hg38 config assembly + gene track; non-human
  // embeds its GenArk assembly in the session and shows the collapsed regions
  // without a hosted track
  const assemblyName = assemblyAccession ?? 'hg38'
  const tracks = assemblyAccession ? [] : [GENE_TRACK]
  const lgv = linearGenomeView(transcript, collapseIntrons, assemblyName, tracks)

  // one MSA source at most: the hosted 100-way (human) or an inline ortholog
  // alignment (non-human, built on demand)
  const msa = msaAvailable
    ? msaViewHosted(transcript, feature, uniprotId)
    : inlineMsa
      ? msaViewInline(transcript, feature, inlineMsa, uniprotId)
      : undefined
  // the 3D view needs only the structure accession + its protein sequence, not
  // the alignment, so it links up for any gene with a UniProt entry
  const protein =
    uniprotId && proteinSequence
      ? proteinView(transcript, feature, uniprotId, proteinSequence)
      : undefined

  const session = {
    name: `Gene explorer: ${transcript.geneName}`,
    // a GenArk assembly the hosted config never defined, supplied inline
    ...(assemblyAccession
      ? { sessionAssemblies: [genArkAssembly(assemblyAccession)] }
      : {}),
    views: [lgv, ...(msa ? [msa] : []), ...(protein ? [protein] : [])],
    // genome (+ alignment when present) on the left, structure on the right
    ...(protein
      ? {
          init: sideBySideLayout(
            [lgv.id, ...(msa ? [msa.id] : [])],
            protein.id,
          ),
        }
      : {}),
  }
  return { session, url: encodedSessionUrl(session) }
}

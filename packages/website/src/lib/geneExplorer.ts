import { TabixIndexedFile } from '@gmod/tabix'
import { RemoteFile } from 'generic-filehandle2'
import { parseGFF } from 'msa-parsers'

import type { GFFRecord } from 'msa-parsers'

// Everything here is fetched live from CORS-enabled public services, so the
// demo works for any human gene with no per-gene data to host:
//
//  - mygene.info  : gene symbol -> hg38 locus + UniProt accession (+ type-ahead)
//  - RefSeq Select: the canonical transcript's exon/CDS model, pulled by locus
//    with tabix and parsed in the browser (this is the "parse GFF" step)
//  - AlphaFold    : the 3D structure, by UniProt accession
//
// Only the 100-way alignment preview needs a hosted file (it is a slice of a
// genome-scale alignment) — see MSA_TABIX / scripts/gene-explorer.

const MYGENE = 'https://mygene.info/v3'

// Canonical (MANE / RefSeq Select) transcripts — one per gene, the same set as
// the hg38-ncbiRefSeqSelect genome track, so codons line up with the alignment.
export const REFSEQ_SELECT_GFF =
  'https://jbrowse.org/ucsc/hg38/ncbiRefSeqSelect.gff.gz'

export const DATA_BASE = 'https://gmod.org/JBrowseMSA/demo/data'
// Tabix file keyed by genomic locus; each line packs one transcript's whole
// 100-way amino-acid alignment (built by scripts/gene-explorer/build-data.mjs).
export const MSA_TABIX = `${DATA_BASE}/hg38.ncbiRefSeq.multiz100way.aa.txt.gz`
export const TREE_URI = `${DATA_BASE}/hg38.multiz100way.nh`

// The JBrowse build + config that bundle jbrowse-plugin-msaview and
// jbrowse-plugin-protein3d (see scripts/gene-explorer/config additions).
export const JBROWSE = 'https://jbrowse.org/code/jb2/webgl-poc/'
export const JBROWSE_CONFIG = `${DATA_BASE}/jbrowse-msa-combined-config.json`
export const GENE_TRACK = 'hg38-ncbiRefSeqSelect'

const alphafoldCif = (uniprotId: string) =>
  `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`

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

// Type-ahead: gene symbols starting with the typed prefix.
export async function searchGenes(query: string): Promise<string[]> {
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
    typeof v === 'object' &&
    v !== null &&
    'hits' in v &&
    Array.isArray((v as { hits: unknown }).hits)
  )
}

// Gene symbol -> hg38 locus + UniProt accession.
export async function resolveGene(symbol: string): Promise<GeneLocus> {
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

let msaTabix: TabixIndexedFile | undefined
function getMsaTabix() {
  msaTabix ??= new TabixIndexedFile({
    filehandle: new RemoteFile(MSA_TABIX),
    csiFilehandle: new RemoteFile(`${MSA_TABIX}.csi`),
  })
  return msaTabix
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
export async function fetchTranscript(locus: GeneLocus): Promise<Transcript> {
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
    ) ?? transcripts[0]
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

function toBlocks(records: GFFRecord[]): Exon[] {
  return records
    .map(r => ({ start: r.start - 1, end: r.end }))
    .sort((a, b) => a.start - b.start)
}

export function exonBp(transcript: Transcript) {
  return transcript.exons.reduce((s, e) => s + (e.end - e.start), 0)
}

export function genomicSpanBp(transcript: Transcript) {
  const start = Math.min(...transcript.exons.map(e => e.start))
  const end = Math.max(...transcript.exons.map(e => e.end))
  return end - start
}

// A space-separated list of exon locstrings. Each becomes one displayedRegion
// in the LinearGenomeView (via JBrowse's navToLocations), so the introns
// between them collapse out — there is no `collapseIntrons` view option, this
// IS how you build a collapsed view declaratively. Locstrings are 1-based.
export function collapsedLoc(transcript: Transcript) {
  return transcript.exons
    .map(e => `${transcript.refName}:${e.start + 1}-${e.end}`)
    .join(' ')
}

// The transcript model the MsaView and ProteinView use to map a residue to its
// codon (and back). 0-based interbase coordinates, CDS subfeatures only.
export function connectedFeature(transcript: Transcript) {
  return {
    uniqueId: transcript.name,
    type: 'mRNA',
    refName: transcript.refName,
    start: Math.min(...transcript.cds.map(c => c.start)),
    end: Math.max(...transcript.cds.map(c => c.end)),
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
  rowCount: number
}

// Fetch one transcript's 100-way alignment from the tabix file. Each matching
// line is `refName<TAB>start<TAB>end<TAB>transcript<TAB>packed`, where `packed`
// is `name:SEQ;name:SEQ;...` (no newlines, so it survives as one tabix column).
export async function fetchGeneMsa(
  transcript: Transcript,
): Promise<GeneMsa | undefined> {
  const start = Math.min(...transcript.exons.map(e => e.start))
  const end = Math.max(...transcript.exons.map(e => e.end))
  const lines = await tabixLines(getMsaTabix(), transcript.refName, start, end)
  const line = lines.find(l => l.split('\t')[3] === transcript.name)
  return line ? unpackMsaLine(line) : undefined
}

function unpackMsaLine(line: string): GeneMsa {
  const packed = line.split('\t')[4] ?? ''
  const rows = packed
    .split(';')
    .filter(Boolean)
    .map(pair => {
      const colon = pair.indexOf(':')
      return { name: pair.slice(0, colon), seq: pair.slice(colon + 1) }
    })
  const fasta = rows.map(r => `>${r.name}\n${r.seq}`).join('\n')
  return {
    fasta,
    // first row is the human reference (= the transcript's translation)
    querySeqName: rows[0]?.name ?? 'hg38',
    rowCount: rows.length,
  }
}

export interface SpecOptions {
  transcript: Transcript
  uniprotId?: string
  proteinSequence?: string
  // include the connected MsaView only when the alignment slice is actually
  // available, so the link is always valid (just the collapsed LGV otherwise)
  msaAvailable?: boolean
}

// Synthesize the declarative JBrowse session: a collapsed-intron
// LinearGenomeView, a connected MsaView (alignment pulled from the tabix file
// by locus at launch), and — when a structure exists — a connected ProteinView.
export function buildSessionSpec({
  transcript,
  uniprotId,
  proteinSequence,
  msaAvailable,
}: SpecOptions) {
  const feature = connectedFeature(transcript)
  const lgvId = `lgv-${transcript.geneName}`

  const msaView = msaAvailable
    ? {
        type: 'MsaView',
        connectedViewId: lgvId,
        connectedFeature: feature,
        querySeqName: 'hg38',
        // declarative tabix MSA source — jbrowse-plugin-msaview forwards
        // msaTabixLocation + msaId into the launch and fetches this gene's rows.
        msaTabixLocation: { uri: MSA_TABIX },
        msaId: transcript.name,
        treeFileLocation: { uri: TREE_URI },
        colorSchemeName: 'clustalx_protein_dynamic',
        labelsAlignRight: true,
        treeAreaWidth: 200,
      }
    : undefined

  const proteinView =
    msaAvailable && uniprotId && proteinSequence
      ? {
          type: 'ProteinView',
          connectedViewId: lgvId,
          url: alphafoldCif(uniprotId),
          feature,
          userProvidedTranscriptSequence: proteinSequence,
          zoomToBaseLevel: false,
          height: 500,
        }
      : undefined

  const lgv = {
    type: 'LinearGenomeView',
    id: lgvId,
    assembly: 'hg38',
    loc: collapsedLoc(transcript),
    colorByCDS: true,
    tracks: [GENE_TRACK],
  }
  const views = [
    lgv,
    ...(msaView ? [msaView] : []),
    ...(proteinView ? [proteinView] : []),
  ]

  // genome+alignment stacked on the left, the 3D structure on the right — only
  // meaningful when all three views are present
  const layout = proteinView
    ? {
        direction: 'horizontal' as const,
        children: [
          { views: [0, 1], size: 58 },
          { views: [2], size: 42 },
        ],
      }
    : undefined

  const spec = layout ? { views, layout } : { views }
  const url = `${JBROWSE}?config=${encodeURIComponent(
    JBROWSE_CONFIG,
  )}&session=spec-${encodeURIComponent(JSON.stringify(spec))}`
  return { spec, url }
}

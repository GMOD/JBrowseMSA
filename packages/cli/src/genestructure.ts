import * as fs from 'node:fs'

import { buildSeqPosIndex, residuesBefore } from 'msa-coordinates'
import { parseMSA } from 'msa-parsers'

import { fetchJsonWithRetry } from './fetchWithRetry.ts'
import { isRecord, isRecordArray } from './json.ts'

import type { MSAFormat } from 'msa-parsers'

// Build a gene-structure GFF (one feature per exon, per alignment row) that
// react-msaview overlays on a coding-sequence alignment the same way it overlays
// InterProScan domains. The exon model comes from NCBI Datasets v2 (RefSeq).
// Every species' Nth exon is named exon-N, so a given exon has the same color in
// every row.
//
// Method (reference projection): take the exon model of one transcript, find
// each coding exon's boundary columns on the reference row, then translate those
// columns into every other row's ungapped coordinates. An exon with a
// frameshifting indel in one lineage is shorter on that row and stays
// column-aligned with the rest.

const API = 'https://api.ncbi.nlm.nih.gov/datasets/v2'

export interface GeneStructureOptions {
  inputFile: string
  outputFile: string
  ref?: string
  gene?: string
  taxon: string
  geneId?: string
  transcript?: string
  format?: MSAFormat
}

interface Exon {
  begin: string
  end: string
  order: number
}
interface Transcript {
  accession_version: string
  name?: string
  type?: string
  length?: number
  select_category?: string
  cds?: { range?: { begin: string; end: string }[] }
  genomic_locations?: { exons: Exon[] }[]
}

function getReports(json: Record<string, unknown>) {
  return isRecordArray(json.reports) ? json.reports : []
}

// NCBI Datasets answers an unknown taxon with 200 and the reason in `messages`
function apiMessage(json: Record<string, unknown>) {
  const first: unknown = Array.isArray(json.messages)
    ? json.messages[0]
    : undefined
  const error = isRecord(first) ? first.error : undefined
  const message = isRecord(error) ? error.message : undefined
  return typeof message === 'string' ? message : undefined
}

export async function resolveGeneId(
  gene: string,
  taxon: string,
): Promise<string> {
  const notFound = `no gene ${gene} in taxon ${taxon}`
  const json = await fetchJsonWithRetry(
    `${API}/gene/symbol/${encodeURIComponent(gene)}/taxon/${encodeURIComponent(taxon)}`,
    notFound,
    isRecord,
  )
  const report = getReports(json)[0] as
    | { gene?: { gene_id?: string } }
    | undefined
  const id = report?.gene?.gene_id
  if (!id) {
    const message = apiMessage(json)
    throw new Error(message ? `${notFound}: ${message}` : notFound)
  }
  return id
}

async function fetchTranscripts(geneId: string): Promise<Transcript[]> {
  const json = await fetchJsonWithRetry(
    `${API}/gene/id/${geneId}/product_report`,
    `no gene with NCBI GeneID ${geneId}`,
    isRecord,
  )
  const transcripts: Transcript[] = []
  for (const report of getReports(json)) {
    const product = (report as { product?: { transcripts?: Transcript[] } })
      .product
    for (const t of product?.transcripts ?? []) {
      transcripts.push(t)
    }
  }
  return transcripts
}

// usable = the report has both a CDS range and a genomic exon mapping. The
// Select transcript occasionally lacks the mapping (mouse Trp53 NM_011640).
function usable(t: Transcript): boolean {
  return !!t.cds?.range?.length && !!t.genomic_locations?.[0]?.exons.length
}

export function pickTranscript(
  transcripts: Transcript[],
  explicit?: string,
): Transcript {
  if (explicit) {
    const bare = explicit.split('.')[0]
    const match = transcripts.find(
      t =>
        t.accession_version === explicit ||
        t.accession_version.split('.')[0] === bare,
    )
    if (!match) {
      throw new Error(
        `transcript "${explicit}" not found among the gene's transcripts`,
      )
    }
    return match
  }
  // with no usable transcript, codingExons reports the error
  const pool = transcripts.some(usable)
    ? transcripts.filter(usable)
    : transcripts
  // within the pool: MANE Select (human), then RefSeq Select (other species),
  // then a curated NM_ transcript, then a predicted XM_ model, then anything
  const chosen =
    pool.find(t => t.select_category === 'MANE_SELECT') ??
    pool.find(t => t.select_category === 'RefSeq_Select') ??
    pool.find(t => t.type === 'PROTEIN_CODING') ??
    pool[0]
  if (!chosen) {
    throw new Error('gene has no transcripts')
  }
  return chosen
}

interface CodingExon {
  exon: number
  cdsStart: number // 0-based offset into the CDS
  cdsLen: number
}

/**
 * Each coding exon's extent within the CDS, in coding order, from exon lengths
 * (transcript order) intersected with the CDS ranges. Both are transcript
 * coordinates, so this is strand-agnostic.
 *
 * A CDS of several ranges, as a programmed frameshift gives, is their
 * concatenation. An exon that two ranges cross yields a piece per range, and
 * the pieces share the exon's number.
 */
export function codingExons(t: Transcript): CodingExon[] {
  const exons = t.genomic_locations?.[0]?.exons ?? []
  const ranges = (t.cds?.range ?? []).map(r => ({
    begin: Number(r.begin),
    end: Number(r.end),
  }))
  if (ranges.length === 0) {
    throw new Error(
      `transcript ${t.accession_version} has no CDS (non-coding?)`,
    )
  }
  if (exons.length === 0) {
    throw new Error(
      `transcript ${t.accession_version} has no genomic exon mapping in the ` +
        `product report; pass --transcript with one that does`,
    )
  }
  let tPos = 1
  const spans = exons
    .toSorted((a, b) => a.order - b.order)
    .map(e => {
      const tStart = tPos
      tPos += Number(e.end) - Number(e.begin) + 1
      return { tStart, tEnd: tPos - 1 }
    })
  const pieces: { index: number; cdsStart: number; cdsLen: number }[] = []
  let cdsOffset = 0
  for (const { begin, end } of ranges) {
    for (const [index, { tStart, tEnd }] of spans.entries()) {
      const cStart = Math.max(tStart, begin)
      const cEnd = Math.min(tEnd, end)
      if (cStart <= cEnd) {
        pieces.push({
          index,
          cdsStart: cdsOffset + cStart - begin,
          cdsLen: cEnd - cStart + 1,
        })
      }
    }
    cdsOffset += end - begin + 1
  }
  const coding = [...new Set(pieces.map(p => p.index))].toSorted(
    (a, b) => a - b,
  )
  return pieces.map(({ index, cdsStart, cdsLen }) => ({
    exon: coding.indexOf(index) + 1,
    cdsStart,
    cdsLen,
  }))
}

export interface ExonColumns {
  exon: number
  c1: number
  c2: number
}

/**
 * The reference transcript's coding exons projected onto every row: each exon's
 * reference boundary columns, re-read in that row's own ungapped (1-based,
 * inclusive) coordinates. A row that carries no residue across an exon's columns
 * contributes no feature for it.
 */
export function projectExonsOntoRows({
  names,
  getRow,
  cols,
}: {
  names: string[]
  getRow: (name: string) => string
  cols: ExonColumns[]
}) {
  return names.flatMap(name => {
    const index = buildSeqPosIndex(getRow(name))
    return cols.flatMap(({ exon, c1, c2 }) => {
      const start = residuesBefore(index, c1)
      const len = residuesBefore(index, c2) - start
      return len > 0 ? [{ name, exon, start: start + 1, end: start + len }] : []
    })
  })
}

export async function runGeneStructure(
  options: GeneStructureOptions,
): Promise<void> {
  const { inputFile, outputFile, gene, taxon, transcript } = options

  console.log(`Reading MSA from ${inputFile}...`)
  const msa = parseMSA(fs.readFileSync(inputFile, 'utf8'), 0, options.format)
  const names = msa.getNames()
  const ref = options.ref ?? names[0]
  if (!ref || !names.includes(ref)) {
    throw new Error(
      `reference row "${ref ?? '(none)'}" not found in the alignment`,
    )
  }
  console.log(`${names.length} rows; reference row = ${ref}`)

  const geneId =
    options.geneId ?? (gene ? await resolveGeneId(gene, taxon) : undefined)
  if (!geneId) {
    throw new Error('provide --gene <symbol> (with --taxon) or --gene-id <id>')
  }
  console.log(`Fetching RefSeq transcripts for gene ${geneId}...`)
  const transcripts = await fetchTranscripts(geneId)
  const chosen = pickTranscript(transcripts, transcript)
  console.log(
    `Using transcript ${chosen.accession_version}` +
      (chosen.select_category ? ` (${chosen.select_category})` : ''),
  )

  // integrity check: exon lengths (transcript order) should sum to the
  // transcript length — a mismatch means we read the wrong genomic mapping
  const exonLenSum = (chosen.genomic_locations?.[0]?.exons ?? []).reduce(
    (a, e) => a + (Number(e.end) - Number(e.begin) + 1),
    0,
  )
  if (chosen.length && exonLenSum !== chosen.length) {
    console.warn(
      `WARNING: exon lengths sum to ${exonLenSum} but transcript length is ` +
        `${chosen.length}; the exon model may be incomplete.`,
    )
  }

  const exons = codingExons(chosen)
  const cdsLen = exons.reduce((a, e) => a + e.cdsLen, 0)
  const refRow = msa.getRow(ref)
  const refIndex = buildSeqPosIndex(refRow)
  const refUngapped = refIndex.length
  console.log(
    `${exons.length} coding exons, CDS ${cdsLen} nt; reference row ungapped ${refUngapped} nt`,
  )
  if (cdsLen !== refUngapped) {
    console.warn(
      `WARNING: CDS length (${cdsLen}) != reference ungapped length ` +
        `(${refUngapped}). Exon boundaries may be off if "${ref}" is not the ` +
        `CDS of ${chosen.accession_version}.`,
    )
  }

  // reference boundary columns for each coding exon [c1, c2)
  const cols = exons.map(e => ({
    exon: e.exon,
    c1: refIndex[e.cdsStart] ?? refRow.length,
    c2: refIndex[e.cdsStart + e.cdsLen] ?? refRow.length,
  }))

  const source = chosen.accession_version
  const lines = [
    '##gff-version 3',
    `# gene-structure overlay: ${gene ?? `gene ${geneId}`} ${source} ` +
      `(${exons.length} coding exons) projected from reference row "${ref}" ` +
      `— react-msaview-cli genestructure`,
  ]
  for (const { name, exon, start, end } of projectExonsOntoRows({
    names,
    getRow: row => msa.getRow(row),
    cols,
  })) {
    lines.push(
      `${name.replaceAll(/[%\t\n\r]/g, encodeURIComponent)}\t${source}\texon\t` +
        `${start}\t${end}\t.\t.\t.\t` +
        `ID=${encodeURIComponent(name)}.exon${exon};Name=exon-${exon}`,
    )
  }

  fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8')
  console.log(`Wrote ${outputFile}`)
}

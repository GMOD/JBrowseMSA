import * as fs from 'node:fs'

import { parseMSA } from 'msa-parsers'

// Build a gene-structure GFF (one feature per exon, per alignment row) that
// react-msaview overlays on a coding-sequence alignment the same way it overlays
// InterProScan domains. The exon model comes from NCBI Datasets v2 (RefSeq), so
// for a CDS alignment whose reference row is a known transcript this is instant
// and deterministic. Every species' Nth exon is named exon-N, so a given exon is
// the same color in every row and the exon architecture reads down the alignment.
//
// Method (reference projection): take the exon model of ONE transcript, find
// each coding exon's boundary columns on the reference row, then translate those
// columns into every other row's own ungapped coordinates. An exon that picks up
// a frameshifting indel in one lineage gets shorter on exactly that row while
// staying column-aligned with the rest.

const API = 'https://api.ncbi.nlm.nih.gov/datasets/v2'

export interface GeneStructureOptions {
  inputFile: string
  outputFile: string
  ref?: string
  gene?: string
  taxon: string
  geneId?: string
  transcript?: string
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
  cds?: { range: { begin: string; end: string }[] }
  genomic_locations?: { exons: Exon[] }[]
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`request failed (${res.status}): ${url}`)
  }
  return res.json()
}

function getReports(json: unknown): Record<string, unknown>[] {
  return (json as { reports?: Record<string, unknown>[] }).reports ?? []
}

async function resolveGeneId(gene: string, taxon: string): Promise<string> {
  const json = await fetchJson(
    `${API}/gene/symbol/${encodeURIComponent(gene)}/taxon/${encodeURIComponent(taxon)}`,
  )
  const report = getReports(json)[0] as
    { gene?: { gene_id?: string } } | undefined
  const id = report?.gene?.gene_id
  if (!id) {
    throw new Error(`no gene found for symbol "${gene}" in taxon "${taxon}"`)
  }
  return id
}

async function fetchTranscripts(geneId: string): Promise<Transcript[]> {
  const json = await fetchJson(`${API}/gene/id/${geneId}/product_report`)
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

// a transcript is usable only if the report gives us both its CDS range and its
// genomic exon mapping — the curated Select transcript occasionally lacks the
// exon mapping (e.g. mouse Trp53 NM_011640), in which case we must fall back to
// one that has it rather than emit an empty overlay
function usable(t: Transcript): boolean {
  return !!t.cds?.range[0] && !!t.genomic_locations?.[0]?.exons.length
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
  // prefer transcripts the report actually maps (CDS + exons); only if none are
  // mapped do we fall back to the raw list (codingExons then errors clearly)
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

// each coding exon's extent within the CDS, in coding order, derived from exon
// lengths (transcript order) intersected with the CDS range — both in transcript
// coordinates, so this is strand-agnostic
export function codingExons(t: Transcript): CodingExon[] {
  const exons = t.genomic_locations?.[0]?.exons ?? []
  const cds = t.cds?.range[0]
  if (!cds) {
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
  const cdsBegin = Number(cds.begin)
  const cdsEnd = Number(cds.end)
  const ordered = [...exons].sort((a, b) => a.order - b.order)
  const out: CodingExon[] = []
  let tPos = 1 // transcript coordinate (1-based) of the current exon's start
  let n = 0
  for (const e of ordered) {
    const len = Number(e.end) - Number(e.begin) + 1
    const tStart = tPos
    const tEnd = tPos + len - 1
    const cStart = Math.max(tStart, cdsBegin)
    const cEnd = Math.min(tEnd, cdsEnd)
    if (cStart <= cEnd) {
      n += 1
      out.push({
        exon: n,
        cdsStart: cStart - cdsBegin,
        cdsLen: cEnd - cStart + 1,
      })
    }
    tPos += len
  }
  return out
}

// 0-based ungapped position -> alignment column holding that non-gap char
function seqPosToCol(row: string, seqPos: number): number {
  let n = 0
  for (let col = 0; col < row.length; col++) {
    if (row[col] !== '-' && row[col] !== '.') {
      if (n === seqPos) {
        return col
      }
      n += 1
    }
  }
  return row.length
}

// prefix[c] = count of non-gap chars in row[0..c) (length row.length + 1), so the
// ungapped span of any column range [c1, c2) is prefix[c2] - prefix[c1] in O(1)
function prefixNonGap(row: string): number[] {
  const prefix = new Array<number>(row.length + 1)
  let n = 0
  prefix[0] = 0
  for (let c = 0; c < row.length; c++) {
    if (row[c] !== '-' && row[c] !== '.') {
      n += 1
    }
    prefix[c + 1] = n
  }
  return prefix
}

export async function runGeneStructure(
  options: GeneStructureOptions,
): Promise<void> {
  const { inputFile, outputFile, gene, taxon, transcript } = options

  console.log(`Reading MSA from ${inputFile}...`)
  const msa = parseMSA(fs.readFileSync(inputFile, 'utf8'))
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
  const refUngapped = prefixNonGap(refRow)[refRow.length]!
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
    c1: seqPosToCol(refRow, e.cdsStart),
    c2: seqPosToCol(refRow, e.cdsStart + e.cdsLen),
  }))

  const source = chosen.accession_version
  const lines = [
    '##gff-version 3',
    `# gene-structure overlay: ${gene ?? `gene ${geneId}`} ${source} ` +
      `(${exons.length} coding exons) projected from reference row "${ref}" ` +
      `— react-msaview-cli genestructure`,
  ]
  for (const name of names) {
    const prefix = prefixNonGap(msa.getRow(name))
    for (const { exon, c1, c2 } of cols) {
      const start = prefix[c1]! // 0-based ungapped start
      const len = prefix[c2]! - start
      if (len > 0) {
        lines.push(
          `${name}\t${source}\texon\t${start + 1}\t${start + len}\t.\t.\t.\t` +
            `ID=${name}.exon${exon};Name=exon-${exon}`,
        )
      }
    }
  }

  fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8')
  console.log(`Wrote ${outputFile}`)
}

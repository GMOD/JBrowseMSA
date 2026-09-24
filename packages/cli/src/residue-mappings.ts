import * as fs from 'node:fs'

import { getUngappedSequence, parseMSA } from 'msa-parsers'

import { fetchWithRetry } from './fetchWithRetry.ts'
import { parseRowRange, toFragment } from './rowRange.ts'
import { parseUniProtAccession } from './uniprotAccession.ts'

import type { RowRange } from './rowRange.ts'
import type { MSAFormat } from 'msa-parsers'
import type { ResidueMapping, ResidueSegment } from 'react-msaview'

const PDBE = 'https://www.ebi.ac.uk/pdbe/api'
const ALPHAFOLD = 'https://alphafold.ebi.ac.uk/api/prediction'
const UNIPROT = 'https://rest.uniprot.org/uniprotkb'

// the AlphaFold API answers a request with no User-Agent with 403
const HEADERS = {
  'User-Agent': 'react-msaview-cli (https://github.com/GMOD/JBrowseMSA)',
}

export type StructureRef = { pdb: string; chain: string } | 'alphafold'

export interface MappingRow {
  row: string
  accession: string
  structure: StructureRef
}

export interface ResidueMappingsOptions {
  msaFile: string
  format?: MSAFormat
  rows: MappingRow[]
  outputFile?: string
  date?: string
}

interface SiftsMapping {
  entity_id: number
  chain_id: string
  struct_asym_id?: string
  unp_start: number
  unp_end: number
  start: { residue_number: number }
  end: { residue_number: number }
}

interface SiftsResponse {
  [pdb: string]: { UniProt?: Record<string, { mappings: SiftsMapping[] }> }
}

interface CoverageResponse {
  [pdb: string]: {
    molecules: {
      chains: {
        chain_id: string
        observed: {
          start: { residue_number: number }
          end: { residue_number: number }
        }[]
      }[]
    }[]
  }
}

interface MoleculesResponse {
  [pdb: string]: { entity_id: number; length?: number }[]
}

interface AlphaFoldEntry {
  entryId?: string
  uniprotAccession?: string
  uniprotStart: number
  uniprotEnd: number
  uniprotSequence?: string
  cifUrl: string
}

export function parseStructure(text: string): StructureRef {
  const trimmed = text.trim()
  if (trimmed.toLowerCase() === 'alphafold') {
    return 'alphafold'
  }
  const match = /^([0-9][A-Za-z0-9]{3}):(\S+)$/.exec(trimmed)
  if (!match) {
    throw new Error(
      `structure "${text}" is neither PDB:CHAIN (such as 6VXX:A) nor alphafold`,
    )
  }
  return { pdb: match[1]!.toUpperCase(), chain: match[2]! }
}

/**
 * Tab-separated `row  accession  structure`, one mapping per line. Lines
 * starting with # and a `row accession structure` header line are skipped.
 */
export function parseRowsTsv(text: string): MappingRow[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('\t').map(field => field.trim()))
    .filter(([row, accession]) => !(row === 'row' && accession === 'accession'))
    .map(fields => {
      const [row, accession, structure] = fields
      if (!row || !accession || !structure) {
        throw new Error(
          `"${fields.join('\t')}" is not row<TAB>accession<TAB>structure`,
        )
      }
      return { row, accession, structure: parseStructure(structure) }
    })
}

async function getJson<T>(
  url: string,
  notFound: string,
  headers?: Record<string, string>,
) {
  const res = await fetchWithRetry(url, { headers })
  if (res.status === 404) {
    throw new Error(notFound)
  }
  if (!res.ok) {
    throw new Error(`${url}: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

function memo<T>(load: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>()
  return (key: string) => {
    let hit = cache.get(key)
    if (!hit) {
      hit = load(key)
      cache.set(key, hit)
    }
    return hit
  }
}

async function fetchUniProtSequence(accession: string) {
  const res = await fetchWithRetry(`${UNIPROT}/${accession}.fasta`)
  if (!res.ok) {
    throw new Error(`UniProt has no entry ${accession} (${res.status})`)
  }
  const seq = (await res.text()).split('\n').slice(1).join('').trim()
  if (!seq) {
    throw new Error(`UniProt returned no sequence for ${accession}`)
  }
  return seq
}

// one request per accession, entry or chain in a run, however many rows share it
function createSources() {
  return {
    uniprotSequence: memo(fetchUniProtSequence),
    sifts: memo(pdb =>
      getJson<SiftsResponse>(
        `${PDBE}/mappings/uniprot/${pdb.toLowerCase()}`,
        `SIFTS has no entry ${pdb}`,
      ),
    ),
    molecules: memo(pdb =>
      getJson<MoleculesResponse>(
        `${PDBE}/pdb/entry/molecules/${pdb.toLowerCase()}`,
        `PDBe has no entry ${pdb}`,
      ),
    ),
    coverage: memo(key => {
      const [pdb, chain] = key.split(':') as [string, string]
      return getJson<CoverageResponse>(
        `${PDBE}/pdb/entry/polymer_coverage/${pdb.toLowerCase()}/chain/${chain}`,
        `PDBe has no chain ${chain} in ${pdb}`,
      )
    }),
    alphafold: memo(accession =>
      getJson<AlphaFoldEntry[]>(
        `${ALPHAFOLD}/${accession}`,
        `AlphaFold DB has no model of ${accession}`,
        HEADERS,
      ),
    ),
  }
}

type Sources = ReturnType<typeof createSources>

function firstDifference(a: string, b: string) {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return i
    }
  }
  return a.length === b.length ? -1 : n
}

/**
 * The row's residues against the protein, or against the `/start-end` slice
 * of it the row name declares. Throws on the first difference.
 */
export function checkRowSequence({
  row,
  accession,
  rowSeq,
  protein,
  range,
}: {
  row: string
  accession: string
  rowSeq: string
  protein: string
  range?: RowRange
}) {
  const expected = range ? protein.slice(range.start - 1, range.end) : protein
  const at = firstDifference(rowSeq, expected)
  if (at === -1) {
    return
  }
  const offset = range ? range.start - 1 : 0
  const what = range ? `${accession} ${range.start}-${range.end}` : accession
  const hint = range
    ? ''
    : fragmentHint(row, accession, rowSeq, protein)
  throw new Error(
    `row ${row} is not ${what}: they first differ at row residue ${at + 1}, ` +
      `where the row has ${rowSeq[at] ?? '(its end)'} and ${accession} ` +
      `residue ${at + 1 + offset} is ${protein[at + offset] ?? '(past its end)'}${hint}`,
  )
}

function fragmentHint(
  row: string,
  accession: string,
  rowSeq: string,
  protein: string,
) {
  const at = rowSeq.length > 0 ? protein.indexOf(rowSeq) : -1
  if (at === -1) {
    return ''
  }
  const range = `${at + 1}-${at + rowSeq.length}`
  return `. The row is ${accession} ${range}; name it ${row}/${range} to map it as that fragment`
}

function complement(observed: RowRange[], length: number) {
  const out: [number, number][] = []
  let next = 1
  for (const { start, end } of [...observed].sort((a, b) => a.start - b.start)) {
    if (start > next) {
      out.push([next, Math.min(start - 1, length)])
    }
    next = Math.max(next, end + 1)
  }
  if (next <= length) {
    out.push([next, length])
  }
  return out
}

/**
 * A run of protein positions `unpStart..unpEnd` at structure positions from
 * `structStart`, moved into row residues and clipped to the row.
 */
function toRowSegment(
  unpStart: number,
  unpEnd: number,
  structStart: number,
  range: RowRange,
): ResidueSegment | undefined {
  const span = toFragment({ start: unpStart, end: unpEnd }, range)
  if (!span) {
    return undefined
  }
  const shift = span.start + range.start - 1 - unpStart
  return {
    rowStart: span.start,
    rowEnd: span.end,
    structStart: structStart + shift,
    structEnd: structStart + shift + span.end - span.start,
  }
}

async function siftsMapping(
  { row, accession }: MappingRow,
  { pdb, chain }: { pdb: string; chain: string },
  range: RowRange,
  sources: Sources,
) {
  const byAccession = (await sources.sifts(pdb))[pdb.toLowerCase()]?.UniProt ?? {}
  const all = byAccession[accession]?.mappings
  if (!all) {
    const found = Object.keys(byAccession)
    throw new Error(
      `${pdb} has no SIFTS mapping to ${accession}` +
        (found.length ? `; it maps ${found.join(', ')}` : ''),
    )
  }
  const mappings = all.filter(m => m.chain_id === chain)
  if (mappings.length === 0) {
    const chains = [...new Set(all.map(m => m.chain_id))]
    throw new Error(
      `${pdb} chain ${chain} has no SIFTS mapping to ${accession}; chains ${chains.join(', ')} do`,
    )
  }
  const segments: ResidueSegment[] = []
  for (const m of mappings) {
    const structStart = m.start.residue_number
    const structEnd = m.end.residue_number
    if (m.unp_end - m.unp_start !== structEnd - structStart) {
      console.warn(
        `  ${row}: SIFTS maps ${accession} ${m.unp_start}-${m.unp_end} onto ${pdb} ${structStart}-${structEnd}, which differ in length; that segment is left out`,
      )
    } else {
      const segment = toRowSegment(m.unp_start, m.unp_end, structStart, range)
      if (segment) {
        segments.push(segment)
      }
    }
  }
  if (segments.length === 0) {
    throw new Error(`${pdb} chain ${chain} covers no residue of row ${row}`)
  }
  segments.sort((a, b) => a.rowStart - b.rowStart)

  const entityId = mappings[0]!.entity_id
  const entity = (await sources.molecules(pdb))[pdb.toLowerCase()]?.find(
    e => e.entity_id === entityId,
  )
  if (entity?.length === undefined) {
    throw new Error(`PDBe gives no length for entity ${entityId} of ${pdb}`)
  }
  const observed = (
    (await sources.coverage(`${pdb}:${chain}`))[pdb.toLowerCase()]?.molecules ?? []
  )
    .flatMap(mol => mol.chains)
    .filter(c => c.chain_id === chain)
    .flatMap(c => c.observed)
    .map(o => ({ start: o.start.residue_number, end: o.end.residue_number }))

  return {
    structure: {
      id: pdb,
      kind: 'experimental' as const,
      asymId: mappings[0]!.struct_asym_id ?? chain,
      url: `https://files.rcsb.org/download/${pdb}.cif`,
    },
    segments,
    unobserved: complement(observed, entity.length),
    by: 'sifts',
  }
}

async function alphafoldMapping(
  { row, accession }: MappingRow,
  protein: string,
  range: RowRange,
  sources: Sources,
) {
  const entries = await sources.alphafold(accession)
  const entry =
    entries.find(e => e.uniprotAccession === accession) ?? entries[0]
  if (!entry) {
    throw new Error(`AlphaFold DB has no model of ${accession}`)
  }
  if (entry.uniprotSequence && entry.uniprotSequence !== protein) {
    throw new Error(
      `the AlphaFold model of ${accession} was built on a sequence that differs from UniProt's current one`,
    )
  }
  const segment = toRowSegment(entry.uniprotStart, entry.uniprotEnd, 1, range)
  if (!segment) {
    throw new Error(
      `the AlphaFold model of ${accession} covers no residue of row ${row}`,
    )
  }
  return {
    structure: {
      id: entry.entryId ?? `AF-${accession}-F1`,
      kind: 'predicted' as const,
      asymId: 'A',
      url: entry.cifUrl,
    },
    segments: [segment],
    by: 'alphafold',
  }
}

/**
 * One `residueMappings` entry per row: the row checked residue by residue
 * against UniProt, then related to the structure through SIFTS or an AlphaFold
 * model's identity numbering.
 */
export async function buildResidueMappings({
  msaText,
  format,
  rows,
  date = new Date().toISOString().slice(0, 10),
}: {
  msaText: string
  format?: MSAFormat
  rows: MappingRow[]
  date?: string
}): Promise<ResidueMapping[]> {
  const msa = parseMSA(msaText, 0, format)
  const names = new Set(msa.getNames())
  const sources = createSources()
  const out: ResidueMapping[] = []
  for (const entry of rows) {
    const { row } = entry
    if (!names.has(row)) {
      throw new Error(`no row "${row}" in the alignment`)
    }
    const parsed = parseUniProtAccession(entry.accession)
    if (!parsed || parsed.suffix) {
      throw new Error(
        `${entry.accession} is not a canonical UniProtKB accession, which SIFTS and AlphaFold DB key by`,
      )
    }
    const accession = parsed.accession
    const rowSeq = getUngappedSequence(msa.getRow(row)).toUpperCase()
    const protein = await sources.uniprotSequence(accession)
    const declared = parseRowRange(row)
    checkRowSequence({ row, accession, rowSeq, protein, range: declared })
    const range = declared ?? { start: 1, end: rowSeq.length }
    const { by, ...mapping } =
      entry.structure === 'alphafold'
        ? await alphafoldMapping(
            { ...entry, accession },
            protein,
            range,
            sources,
          )
        : await siftsMapping(
            { ...entry, accession },
            entry.structure,
            range,
            sources,
          )
    console.error(
      `  ${row}: ${accession} onto ${mapping.structure.id}` +
        (mapping.structure.kind === 'experimental'
          ? ` chain ${mapping.structure.asymId}`
          : '') +
        `, ${mapping.segments
          .map(
            s =>
              `row ${s.rowStart}-${s.rowEnd} at ${s.structStart}-${s.structEnd}`,
          )
          .join(', ')}`,
    )
    out.push({
      row,
      accession,
      structure: mapping.structure,
      segments: mapping.segments,
      ...('unobserved' in mapping ? { unobserved: mapping.unobserved } : {}),
      rowLength: rowSeq.length,
      generated: { by, date },
    })
  }
  return out
}

export async function runResidueMappings(options: ResidueMappingsOptions) {
  const residueMappings = await buildResidueMappings({
    msaText: fs.readFileSync(options.msaFile, 'utf8'),
    format: options.format,
    rows: options.rows,
    date: options.date,
  })
  const json = `${JSON.stringify({ residueMappings }, null, 2)}\n`
  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, json, 'utf8')
    console.error(`wrote ${options.outputFile}`)
  } else {
    process.stdout.write(json)
  }
}

import { generateNodeIds } from '../util.ts'
import BaseMSA from './BaseMSA.ts'
import parseNewick from './parseNewick.ts'
import { parseAll } from './stockholmParser.ts'

import type { Annotation, MSATrack, NodeWithIds } from '../types.ts'
import type { StockholmData } from './stockholmParser.ts'

export default class StockholmMSA extends BaseMSA {
  private data: StockholmData[]
  private MSA: StockholmData

  constructor(text: string, currentAlignment: number) {
    const res = parseAll(text)
    const aln = res[currentAlignment] ?? res[0]
    if (!aln) {
      throw new Error('No alignments found in Stockholm file')
    }
    super(aln.seqname.map(name => [name, aln.seqdata[name] ?? '']))
    this.data = res
    this.MSA = aln
  }

  getMSA() {
    return this.MSA
  }

  get alignmentNames() {
    return this.data.map((aln, idx) => aln.gf.DE?.[0] ?? `Alignment ${idx + 1}`)
  }

  getHeader() {
    const acEntries = this.MSA.gs.AC ?? {}
    const drEntries = this.MSA.gs.DR ?? {}
    return {
      General: this.MSA.gf,
      Accessions: Object.fromEntries(
        Object.entries(acEntries).map(([k, v]) => [k, v[0]]),
      ),
      Dbxref: Object.fromEntries(
        Object.entries(drEntries).map(([k, v]) => [k, v.join('; ')]),
      ),
    }
  }

  getRowData(rowName: string) {
    return {
      name: rowName,
      accession: this.MSA.gs.AC?.[rowName]?.[0],
      dbxref: this.MSA.gs.DR?.[rowName]?.join('; '),
    }
  }

  getStructures() {
    const pdbRegex = /PDB; +(\S+) +([^;\s]+); *(-?[0-9]+)-(-?[0-9]+)/
    const drEntries = this.MSA.gs.DR ?? {}
    const result: Record<
      string,
      { pdb: string; chain: string; startPos: number; endPos: number }[]
    > = {}
    for (const [id, drList] of Object.entries(drEntries)) {
      for (const dr of drList) {
        const match = pdbRegex.exec(dr)
        if (match) {
          ;(result[id] ??= []).push({
            pdb: match[1]!.toLowerCase(),
            chain: match[2]!,
            startPos: +match[3]!,
            endPos: +match[4]!,
          })
        }
      }
    }
    return result
  }

  getTree(): NodeWithIds {
    const tree = this.MSA.gf.NH?.[0]
    return tree ? generateNodeIds(parseNewick(tree)) : super.getTree()
  }

  get seqConsensus() {
    return this.MSA.gc.seq_cons
  }

  get secondaryStructureConsensus() {
    return this.MSA.gc.SS_cons
  }

  /**
   * One text track per `#=GC` line, which describes every row's column at
   * once. A `#=GR` line describes one row, so it becomes that row's
   * annotations instead (see `annotations`).
   */
  get tracks(): MSATrack[] {
    const { seq_cons, SS_cons, ...otherGc } = this.MSA.gc
    return [
      {
        id: 'seqConsensus',
        name: 'Sequence consensus',
        data: seq_cons,
        customColorScheme: {},
      },
      {
        id: 'secondaryStruct',
        name: 'Secondary-structure',
        data: SS_cons,
        customColorScheme: wussColors,
      },
      ...Object.entries(otherGc).map(([tag, data]) => ({
        id: `gc-${tag}`,
        name: tag,
        data,
        customColorScheme: structureColors(tag),
      })),
    ]
  }

  /**
   * Each `#=GR` line as annotations on its row: one per run of a repeated
   * mark, in the row's own residue positions, so the domain overlay, legend
   * and filter draw them. They start hidden, since an Rfam family carries a
   * structure line for every row with a PDB entry.
   */
  get annotations(): Annotation[] {
    return Object.entries(this.MSA.gr).flatMap(([tag, byRow]) =>
      Object.entries(byRow).flatMap(([row, line]) =>
        grRuns(line, this.MSA.seqdata[row] ?? '').flatMap(run => {
          const kind = markKind(run.mark)
          if (kind === null) {
            return []
          }
          const name = kind ? `${tag} ${kind}` : tag
          return [
            {
              id: row,
              accession: name,
              name,
              description: `#=GR ${tag}`,
              start: run.start,
              end: run.end,
              color: structureColors(tag)[run.mark] ?? kindColors[kind],
              defaultOff: true,
            },
          ]
        }),
      ),
    )
  }
}

// One annotation type per kind of mark rather than per character: DSSP writes
// a helix as H, G or I and a strand as E or B, and WUSS writes a base pair as
// any of four bracket shapes. The loop and turn codes mark nothing worth a
// box, so they return null. A mark that is a flag (`*` in an active-site
// line) names no kind, and the annotation takes the tag's name alone
function markKind(mark: string) {
  if (mark === '*') {
    return ''
  }
  if ('HGI'.includes(mark)) {
    return 'helix'
  }
  if ('EB'.includes(mark)) {
    return 'strand'
  }
  if ('TSC'.includes(mark)) {
    return null
  }
  if ('<>()[]{}'.includes(mark)) {
    return 'paired'
  }
  return mark
}

// Jalview's secondary structure colors
const kindColors: Record<string, string> = {
  helix: '#e53935',
  strand: '#43a047',
}

// marks that say "nothing here" in a #=GR line: Pfam's dots and dashes, and
// WUSS's unpaired positions
const emptyMarks = new Set(['.', '-', '_', ',', ':', '~', ' '])

function isGap(c: string | undefined) {
  return c === '-' || c === '.'
}

// runs of one repeated mark, as 1-based inclusive residue positions in the
// row, skipping the row's gap columns
export function grRuns(line: string, seq: string) {
  const runs: { mark: string; start: number; end: number }[] = []
  let residue = 0
  let open: { mark: string; start: number; end: number } | undefined
  for (let col = 0; col < line.length; col++) {
    if (isGap(seq[col])) {
      continue
    }
    residue++
    const mark = line[col]!
    if (open?.mark === mark) {
      open.end = residue
    } else {
      open = emptyMarks.has(mark)
        ? undefined
        : { mark, start: residue, end: residue }
      if (open) {
        runs.push(open)
      }
    }
  }
  return runs
}

// WUSS writes base-paired columns as open/close brackets of several nesting
// types (<>, (), [], {}); coloring every open one way and every close the other
// highlights each helix, including the tRNA acceptor stem written with parens
const wussColors: Record<string, string> = {
  '<': 'lightblue',
  '(': 'lightblue',
  '[': 'lightblue',
  '{': 'lightblue',
  '>': 'pink',
  ')': 'pink',
  ']': 'pink',
  '}': 'pink',
}

// `SS`, and Rfam's per-structure `2GIS_A_SS`
function structureColors(tag: string) {
  return tag === 'SS' || tag.endsWith('_SS') ? wussColors : {}
}

export { sniff as stockholmSniff } from './stockholmParser.ts'

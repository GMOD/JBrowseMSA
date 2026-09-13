import { generateNodeIds } from '../util.ts'
import BaseMSA from './BaseMSA.ts'
import parseNewick from './parseNewick.ts'
import { parseAll } from './stockholmParser.ts'

import type { MSATrack, NodeWithIds } from '../types.ts'
import type { StockholmData } from './stockholmParser.ts'

export default class StockholmMSA extends BaseMSA {
  private data: StockholmData[]
  private MSA: StockholmData

  constructor(text: string, currentAlignment: number) {
    super()
    const res = parseAll(text)
    this.data = res
    const aln = res[currentAlignment] ?? res[0]
    if (!aln) {
      throw new Error('No alignments found in Stockholm file')
    }
    this.MSA = aln
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string) {
    return this.MSA.seqdata[name] ?? ''
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

  getNames() {
    // seqname, not Object.keys(seqdata): object key order hoists integer-like
    // keys (a numeric sequence name) to the front, scrambling row order
    return this.MSA.seqname
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
   * One text track per `#=GC` line, and one per `#=GR` line that stays hidden
   * until asked for: a Pfam seed carries a few per-row active-site lines, but
   * an Rfam family carries a structure line for every row with a PDB entry.
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
      ...Object.entries(this.MSA.gr).flatMap(([tag, byRow]) =>
        Object.entries(byRow).map(([row, data]) => ({
          id: `gr-${row}-${tag}`,
          name: `${row} ${tag}`,
          data,
          customColorScheme: structureColors(tag),
          defaultOff: true,
        })),
      ),
    ]
  }
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

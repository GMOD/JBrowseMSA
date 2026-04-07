import parseNewick from './parseNewick.ts'
import { parseAll } from './stockholmParser.ts'
import { generateNodeIds } from '../util.ts'
import BaseMSA from './BaseMSA.ts'

import type { NodeWithIds } from '../types.ts'
import type { StockholmData } from './stockholmParser.ts'

export default class StockholmMSA extends BaseMSA {
  private data: StockholmData[]
  private MSA: StockholmData

  constructor(text: string, currentAlignment: number) {
    super()
    const res = parseAll(text)
    this.data = res
    this.MSA = res[currentAlignment]!
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string) {
    return this.MSA.seqdata[name] || ''
  }

  getWidth() {
    const name = Object.keys(this.MSA.seqdata)[0]!
    return this.getRow(name).length
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
    return Object.keys(this.MSA.seqdata)
  }

  getStructures() {
    const pdbRegex = /PDB; +(\S+) +(\S); ([0-9]+)-([0-9]+)/
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

  get tracks() {
    return [
      {
        id: 'seqConsensus',
        name: 'Sequence consensus',
        data: this.seqConsensus,
        customColorScheme: {},
      },
      {
        id: 'secondaryStruct',
        name: 'Secondary-structure',
        data: this.secondaryStructureConsensus,
        customColorScheme: {
          '>': 'pink',
          '<': 'lightblue',
        },
      },
    ]
  }
}

export { sniff as stockholmSniff } from './stockholmParser.ts'

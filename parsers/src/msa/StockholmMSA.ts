import parseNewick from './parseNewick'
import { parseAll } from './stockholmParser'
import { generateNodeIds } from '../util'

import type { NodeWithIds } from '../types'
import type { StockholmData } from './stockholmParser'

export default class StockholmMSA {
  private data: StockholmData[]
  private MSA: StockholmData

  constructor(text: string, currentAlignment: number) {
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

  getSeqCoords() {}

  getStructures() {
    const pdbRegex = /PDB; +(\S+) +(\S); ([0-9]+)-([0-9]+)/
    const drEntries = this.MSA.gs.DR ?? {}
    const args = Object.entries(drEntries)
      .flatMap(([id, drList]) =>
        drList.map(dr => {
          const match = pdbRegex.exec(dr)
          return match ? { id, match } : null
        }),
      )
      .filter((item): item is { id: string; match: RegExpExecArray } => !!item)
      .map(({ id, match }) => ({
        id,
        pdb: match[1]!.toLowerCase(),
        chain: match[2]!,
        startPos: +match[3]!,
        endPos: +match[4]!,
      }))

    const ret = {} as Record<
      string,
      { pdb: string; chain: string; startPos: number; endPos: number }[]
    >
    for (const entry of args) {
      const { id, ...rest } = entry
      if (!ret[id]) {
        ret[id] = []
      }
      ret[id].push(rest)
    }
    return ret
  }

  getTree(): NodeWithIds {
    const tree = this.MSA.gf.NH?.[0]
    return tree
      ? generateNodeIds(parseNewick(tree))
      : {
          id: 'root',
          name: 'root',
          noTree: true,
          children: this.getNames().map(name => ({
            id: name,
            children: [],
            name,
          })),
        }
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

export { sniff as stockholmSniff } from './stockholmParser'

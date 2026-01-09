import Stockholm from 'stockholm-js'

import parseNewick from './parseNewick'
import { generateNodeIds } from '../util'

import type { NodeWithIds } from '../types'

interface StockholmEntry {
  gf: {
    DE?: string[]
    NH?: string[]
  }
  gs?: {
    AC: Record<string, string>
    DR?: Record<string, string>
  }
  gc?: {
    SS_cons?: string
    seq_cons?: string
  }
  seqdata: Record<string, string>
}

export default class StockholmMSA {
  private data: StockholmEntry[]
  private MSA: StockholmEntry

  constructor(text: string, currentAlignment: number) {
    const res = Stockholm.parseAll(text)
    this.data = res
    this.MSA = res[currentAlignment]
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
    return this.data.map((aln, idx) => aln.gf.DE?.[0] || `Alignment ${idx + 1}`)
  }

  getHeader() {
    return {
      General: this.MSA.gf,
      Accessions: this.MSA.gs?.AC,
      Dbxref: this.MSA.gs?.DR,
    }
  }

  getRowData(rowName: string) {
    return {
      name: rowName,
      accession: this.MSA.gs?.AC[rowName],
      dbxref: this.MSA.gs?.DR?.[rowName],
    }
  }

  getNames() {
    return Object.keys(this.MSA.seqdata)
  }

  getSeqCoords() {}

  getStructures() {
    const pdbRegex = /PDB; +(\S+) +(\S); ([0-9]+)-([0-9]+)/
    const ent = this.MSA
    const args = Object.entries(ent.gs?.DR || {})
      .map(([id, dr]) => [id, pdbRegex.exec(dr)] as const)
      .filter((item): item is [string, RegExpExecArray] => !!item[1])
      .map(([id, match]) => {
        const pdb = match[1]!.toLowerCase()
        const chain = match[2]!
        const startPos = +match[3]!
        const endPos = +match[4]!
        return { id, pdb, chain, startPos, endPos }
      })

    const ret = {} as Record<string, Omit<(typeof args)[0], 'id'>[]>
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
    return this.MSA.gc?.seq_cons
  }
  get secondaryStructureConsensus() {
    return this.MSA.gc?.SS_cons
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

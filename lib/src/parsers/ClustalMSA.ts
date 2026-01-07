import { parse } from 'clustal-js'

import type { NodeWithIds } from '../types'

export default class ClustalMSA {
  private MSA: ReturnType<typeof parse>

  constructor(text: string) {
    this.MSA = parse(text)
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string): string {
    return this.MSA.alns.find(aln => aln.id === name)?.seq || ''
  }

  getWidth() {
    return this.MSA.alns[0]!.seq.length
  }

  getRowData() {
    return undefined
  }

  getHeader() {
    return this.MSA.header
  }

  getNames() {
    return this.MSA.alns.map(aln => aln.id)
  }

  getStructures() {
    return {}
  }

  get alignmentNames() {
    return []
  }

  getTree(): NodeWithIds {
    return {
      id: 'root',
      name: 'root',
      noTree: true,
      children: this.getNames()
        .filter((name): name is string => name !== undefined)
        .map(name => ({
          id: name,
          name,
          children: [],
        })),
    }
  }

  get seqConsensus() {
    return this.MSA.consensus
  }
  get secondaryStructureConsensus() {
    return undefined
  }

  get tracks() {
    return []
  }
}

import { parseEmfAln } from 'emf-js'

import type { NodeWithIds } from '../types'

export default class EmfMSA {
  private MSA: ReturnType<typeof parseEmfAln>

  constructor(text: string) {
    this.MSA = parseEmfAln(text)
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string): string {
    return this.MSA.find(aln => aln.protein === name)?.seq || ''
  }

  getWidth() {
    return this.MSA[0]!.seq.length
  }

  getRowData() {
    return undefined
  }

  getHeader() {
    return ''
  }

  getNames() {
    return this.MSA.map(aln => aln.protein)
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
      children: this.getNames().map(name => ({
        id: name,
        name,
        children: [],
      })),
    }
  }

  get seqConsensus() {
    return undefined
  }
  get secondaryStructureConsensus() {
    return undefined
  }

  get tracks() {
    return []
  }
}

import { parse } from 'clustal-js'

import BaseMSA from './BaseMSA.ts'

export default class ClustalMSA extends BaseMSA {
  private MSA: ReturnType<typeof parse>

  constructor(text: string) {
    super()
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

  getHeader() {
    return this.MSA.header
  }

  getNames() {
    return this.MSA.alns.map(aln => aln.id)
  }

  get seqConsensus() {
    return this.MSA.consensus
  }
}

import { parse } from 'clustal-js'

import BaseMSA from './BaseMSA.ts'

export default class ClustalMSA extends BaseMSA {
  private MSA: ReturnType<typeof parse>

  constructor(text: string) {
    const msa = parse(text)
    super(msa.alns.map(aln => [aln.id, aln.seq]))
    this.MSA = msa
  }

  getHeader() {
    return this.MSA.header
  }

  get seqConsensus() {
    return this.MSA.consensus
  }
}

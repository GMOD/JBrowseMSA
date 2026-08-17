import { parse } from 'clustal-js'

import BaseMSA from './BaseMSA.ts'

export default class ClustalMSA extends BaseMSA {
  private MSA: ReturnType<typeof parse>

  // getRow is called once per leaf on every render pass, so a linear scan of
  // alns makes a full pass quadratic in the row count
  private byName: Map<string, string>

  constructor(text: string) {
    super()
    this.MSA = parse(text)
    this.byName = new Map()
    for (const aln of this.MSA.alns) {
      // first wins, as the find() this replaced did
      if (!this.byName.has(aln.id)) {
        this.byName.set(aln.id, aln.seq)
      }
    }
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string): string {
    return this.byName.get(name) ?? ''
  }

  getHeader() {
    return this.MSA.header
  }

  // deduped, matching the first-wins byName map: emitting a repeated id twice
  // renders a phantom duplicate row showing the first record's residues
  getNames() {
    return [...this.byName.keys()]
  }

  get seqConsensus() {
    return this.MSA.consensus
  }
}

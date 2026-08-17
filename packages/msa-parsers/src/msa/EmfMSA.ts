import { parseEmfAln } from 'emf-js'

import BaseMSA from './BaseMSA.ts'

export default class EmfMSA extends BaseMSA {
  private MSA: ReturnType<typeof parseEmfAln>

  // getRow is called once per leaf on every render pass, so a linear scan of
  // the alignment makes a full pass quadratic in the row count
  private byName: Map<string, string>

  constructor(text: string) {
    super()
    this.MSA = parseEmfAln(text)
    this.byName = new Map()
    for (const aln of this.MSA) {
      // first wins, as the find() this replaced did
      if (!this.byName.has(aln.protein)) {
        this.byName.set(aln.protein, aln.seq)
      }
    }
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string): string {
    return this.byName.get(name) ?? ''
  }

  // deduped, matching the first-wins byName map: emitting a repeated id twice
  // renders a phantom duplicate row showing the first record's residues
  getNames() {
    return [...this.byName.keys()]
  }
}

import { parseEmfAln } from 'emf-js'

import BaseMSA from './BaseMSA.ts'

export default class EmfMSA extends BaseMSA {
  private MSA: ReturnType<typeof parseEmfAln>

  constructor(text: string) {
    super()
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

  getHeader() {
    return ''
  }

  getNames() {
    return this.MSA.map(aln => aln.protein)
  }
}

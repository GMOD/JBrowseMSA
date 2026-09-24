import { parseEmfAln } from 'emf-js'

import BaseMSA from './BaseMSA.ts'

export default class EmfMSA extends BaseMSA {
  constructor(text: string) {
    super(parseEmfAln(text).map(aln => [aln.protein, aln.seq]))
  }
}

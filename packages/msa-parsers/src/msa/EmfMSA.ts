import BaseMSA from './BaseMSA.ts'
import { parseEmfAlignment } from './emf.ts'

export default class EmfMSA extends BaseMSA {
  constructor(text: string) {
    super(parseEmfAlignment(text).map(aln => [aln.protein, aln.seq]))
  }
}

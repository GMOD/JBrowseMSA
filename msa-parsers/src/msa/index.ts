import A3mMSA from './A3mMSA.ts'
import ClustalMSA from './ClustalMSA.ts'
import EmfMSA from './EmfMSA.ts'
import FastaMSA from './FastaMSA.ts'
import StockholmMSA, { stockholmSniff } from './StockholmMSA.ts'

export { parseEmfTree } from 'emf-js'
export { default as parseNewick } from './parseNewick.ts'

export type MSAParserType =
  | StockholmMSA
  | A3mMSA
  | FastaMSA
  | EmfMSA
  | ClustalMSA

export function parseMSA(text: string, currentAlignment = 0): MSAParserType {
  if (stockholmSniff(text)) {
    return new StockholmMSA(text, currentAlignment)
  }
  if (A3mMSA.sniff(text)) {
    return new A3mMSA(text)
  }
  if (text.startsWith('>')) {
    return new FastaMSA(text)
  }
  if (text.startsWith('SEQ')) {
    return new EmfMSA(text)
  }
  return new ClustalMSA(text)
}

/**
 * Get ungapped sequence from an aligned row
 */
export function getUngappedSequence(alignedSeq: string): string {
  return alignedSeq.replaceAll(/[.-]/g, '')
}

export { default as A3mMSA } from './A3mMSA.ts'
export { default as ClustalMSA } from './ClustalMSA.ts'
export { default as EmfMSA } from './EmfMSA.ts'
export { default as FastaMSA } from './FastaMSA.ts'
export { default as StockholmMSA, stockholmSniff } from './StockholmMSA.ts'

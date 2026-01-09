import A3mMSA from './A3mMSA'
import ClustalMSA from './ClustalMSA'
import EmfMSA from './EmfMSA'
import FastaMSA from './FastaMSA'
import StockholmMSA, { stockholmSniff } from './StockholmMSA'

export { parseEmfTree } from 'emf-js'
export { default as parseNewick } from './parseNewick'

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

export { default as A3mMSA } from './A3mMSA'
export { default as ClustalMSA } from './ClustalMSA'
export { default as EmfMSA } from './EmfMSA'
export { default as FastaMSA } from './FastaMSA'
export { default as StockholmMSA } from './StockholmMSA'

import A3mMSA from './A3mMSA.ts'
import ClustalMSA from './ClustalMSA.ts'
import EmfMSA from './EmfMSA.ts'
import FastaMSA from './FastaMSA.ts'
import StockholmMSA, { stockholmSniff } from './StockholmMSA.ts'
import { fastaSniff, splitFastaRecords } from './fastaRecords.ts'

export { parseEmfTree } from 'emf-js'
export { default as parseNewick } from './parseNewick.ts'

export type MSAParserType =
  | StockholmMSA
  | A3mMSA
  | FastaMSA
  | EmfMSA
  | ClustalMSA

export type MSAFormat = 'stockholm' | 'a3m' | 'fasta' | 'emf' | 'clustal'

const htmlPage = /^<(!doctype\s+html|html[\s>])/i
const clustalHeader = /^(CLUSTAL|MUSCLE|PROBCONS|MSAPROBS|Kalign)/i

// A caller that knows the format, such as impg emitting fasta-aln, passes
// `format` to skip sniffing, which cannot always tell FASTA from A3M
export function parseMSA(
  input: string,
  currentAlignment = 0,
  format?: MSAFormat,
): MSAParserType {
  const text = input
    .replace(/^\uFEFF/, '')
    .replaceAll(/\r\n?/g, '\n')
    .trimStart()
  if (htmlPage.test(text)) {
    throw new Error(
      'Received an HTML page, not an alignment. Check that the URL points at the file itself',
    )
  }
  if (format === 'stockholm') {
    return new StockholmMSA(text, currentAlignment)
  }
  if (format === 'a3m') {
    return new A3mMSA(text)
  }
  if (format === 'fasta') {
    return new FastaMSA(text)
  }
  if (format === 'emf') {
    return new EmfMSA(text)
  }
  if (format === 'clustal') {
    return new ClustalMSA(text)
  }
  if (stockholmSniff(text)) {
    return new StockholmMSA(text, currentAlignment)
  }
  if (fastaSniff(text)) {
    const records = splitFastaRecords(text)
    return A3mMSA.sniff(records) ? new A3mMSA(records) : new FastaMSA(records)
  }
  if (text.startsWith('SEQ')) {
    return new EmfMSA(text)
  }
  if (clustalHeader.test(text)) {
    return new ClustalMSA(text)
  }
  const firstLine = text.split('\n', 1)[0]!.slice(0, 80)
  throw new Error(
    firstLine
      ? `Unrecognized alignment format: expected FASTA, A3M, Stockholm, Clustal or EMF, but the first line reads "${firstLine}"`
      : 'The alignment file is empty',
  )
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

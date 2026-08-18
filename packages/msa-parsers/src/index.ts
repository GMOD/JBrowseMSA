// Types
export type * from './types.ts'

// Utilities
export { generateNodeIds } from './util.ts'

// MSA parsers
export {
  A3mMSA,
  ClustalMSA,
  EmfMSA,
  FastaMSA,
  StockholmMSA,
  getUngappedSequence,
  parseEmfTree,
  parseMSA,
  parseNewick,
  stockholmSniff,
} from './msa/index.ts'
export type { MSAFormat, MSAParserType } from './msa/index.ts'

// Overlay annotations: the canonical shape, and the adapters onto it
export {
  indexResultsByXref,
  interProScanResponseToAnnotations,
  interProScanToAnnotations,
} from './interProScanToAnnotations.ts'

// GFF parsing
export {
  annotationsToGFF,
  gffToAnnotations,
  interProResponseToGFF,
  interProToGFF,
  parseGFF,
} from './gff/index.ts'

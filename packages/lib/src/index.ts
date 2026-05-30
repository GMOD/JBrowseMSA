// PUBLIC API — consumed by external JBrowse 2 plugins. Changing or removing any
// export here is a breaking change for downstream repos:
//   - jbrowse-plugin-msaview   (wraps MSAModelF + MSAView into a JBrowse view)
//   - jbrowse-plugin-protein3d (drives MSA<->structure hover/highlight sync)
// Those plugins also reach into the MsaViewModel instance at runtime; the model
// members they rely on (e.g. mouseCol/setMousePos, setHighlightedColumns,
// seqPosToVisibleCol/visibleColToSeqPos) are flagged inline in model.ts.
export { default as MSAView } from './components/Loading.tsx'
export { default as MSAViewer } from './components/MSAViewer.tsx'
export { type MsaViewModel, default as MSAModelF } from './model.ts'
export type { MSAParserType } from 'msa-parsers'
export type { HierarchyNode } from './hierarchy.ts'
export type { InterProScanResults } from './launchInterProScan.ts'
export type {
  Accession,
  BasicTrack,
  BasicTrackModel,
  Node,
  NodeWithIds,
  NodeWithIdsAndLength,
  TextTrackModel,
} from './types.ts'

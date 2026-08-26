// PUBLIC API — consumed by external JBrowse 2 plugins. Changing or removing any
// export here is a breaking change for downstream repos:
//   - jbrowse-plugin-msaview   (wraps MSAModelF + MSAView into a JBrowse view)
//   - jbrowse-plugin-protein3d (drives MSA<->structure hover/highlight sync)
// Those plugins also reach into the MsaViewModel instance at runtime; the model
// members they rely on (e.g. mouseCol/setMousePos, setHighlightedColumns,
// seqPosToVisibleCol/visibleColToSeqPos) are flagged inline in model.ts.
export { renderToSvg } from './renderToSvg.tsx'
// renderToSvg outside a browser needs DOM bits jsdom omits; react-msaview-cli
// and the README figure generator both drive it that way
export {
  CHAR_WIDTH_RATIO,
  installHeadlessRenderEnv,
} from './headlessRenderEnv.ts'
export { default as MSAView } from './components/Loading.tsx'
export { default as MSAViewer } from './components/MSAViewer.tsx'
export { type MsaViewModel, default as MSAModelF } from './model.ts'
export type { MSAFormat, MSAParserType } from 'msa-parsers'
export type { HierarchyNode } from './hierarchy.ts'
// InterProScanResults is the EBI wire format that setDomains still accepts;
// Annotation is the source-agnostic shape everything else is written against
export type { InterProScanResults } from 'msa-parsers'
// ColumnCounts, DomainBand and TidyDomainAnnotation surface in the inferred type
// of the composed state model, so a downstream plugin cannot emit declarations
// for its own stateModelFactory without being able to name them (TS2883).
// jbrowse-plugin-msaview already re-exports MSAFormat for exactly this reason.
export type { ColumnCounts } from './columnCounts.ts'
export type {
  Accession,
  Annotation,
  BasicTrack,
  BasicTrackModel,
  DomainBand,
  Node,
  NodeWithIds,
  NodeWithIdsAndLength,
  TextTrackModel,
  TidyDomainAnnotation,
} from './types.ts'

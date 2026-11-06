// PUBLIC API — consumed by external JBrowse 2 plugins. Changing or removing any
// export here is a breaking change for downstream repos:
//   - jbrowse-plugin-msaview (wraps MSAModelF + MSAView into a JBrowse view)
//   - jbrowse-plugin-tview   (the same, for a tree-first view)
// Those plugins also reach into the MsaViewModel instance at runtime; the model
// members they rely on (e.g. mouseCol/setMousePos, setHighlightedColumns,
// seqPosToVisibleCol/visibleColToSeqPos) are flagged inline in model.ts.
// jbrowse-plugin-protein3d no longer depends on this package at all: it reads
// the msaview plugin's model through a structural type of its own.
export { renderToSvg } from './renderToSvg.tsx'
export type { ExportSvgOptions } from './renderToSvg.tsx'
// renderToSvg outside a browser needs DOM bits jsdom omits; react-msaview-cli
// and the README figure generator both drive it that way
export { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
export { CHAR_WIDTH_RATIO } from './measureTextCanvas.ts'
// the row count above which calculateNeighborJoiningTreeFromMSA throws, for
// hosts gating their own menu item
export { isSiteType, maxNeighborJoiningRows } from './constants.ts'
// the short forms a link or a script can write a view in; see docs/layers.md
export { expandSpec, residueLabel } from './expandSpec.ts'
export type {
  ColumnTrackShorthand,
  HighlightShorthand,
  MsaSpec,
  RegionShorthand,
} from './expandSpec.ts'
export { default as MSAView } from './components/Loading.tsx'
export type { ToolbarSlots } from './components/header/Header.tsx'
export type { ImportSlots } from './components/import/ImportForm.tsx'
export { default as MSAViewer } from './components/MSAViewer.tsx'
export type { MSAViewerProps } from './components/MSAViewer.tsx'
// the snapshot MSAViewer builds from its props, for the CLI's --props
export { resolveTheme, viewerSnapshot } from './viewerSnapshot.ts'
// the active scheme's hex color for a row residue, to paint a structure with
export { schemeResidueColor } from './schemeResidueColor.ts'
export { mount } from './mount.tsx'
export { defineMsaElement } from './element.ts'
export { useMsaSvgFigure } from './useMsaSvgFigure.ts'
export type { MsaSvgFigure } from './useMsaSvgFigure.ts'
export type { MountedViewer } from './mount.tsx'
export { type MsaViewModel, default as MSAModelF } from './model.ts'
export type { MSAFormat, MSAParserType } from 'msa-parsers'
export type { HierarchyNode, LaidOutNode, TreeScale } from './hierarchy.ts'
// InterProScanResults is the EBI wire format interProScanToAnnotations reads;
// Annotation is the source-agnostic shape everything else is written against
export type { InterProScanResults } from 'msa-parsers'
// ColumnCounts, ColumnStats, DomainBand and TidyDomainAnnotation surface in the
// inferred type of the composed state model, so a downstream plugin cannot emit
// declarations for its own stateModelFactory without being able to name them
// (TS2883). jbrowse-plugin-msaview already re-exports MSAFormat for exactly this
// reason.
export type { ColumnCounts } from './columnCounts.ts'
export type { ColumnStats } from './columnStats.ts'
export type { ZoomSnapshot } from './zoomSnapshot.ts'
// the color object a channel reads its field through, and what resolving one
// gives
export type {
  ColorChannel,
  ColorSpec,
  LegacyColumnTrack,
  LegacyEncoding,
  LegacyFeatureEncoding,
  LegacyRowPanel,
  LegacyStrip,
  LegacyScale,
  ResolvedScale,
  ScaleTable,
  SharedScale,
} from './scales.ts'
export type {
  Accession,
  Annotation,
  Arc,
  ArcSpec,
  ArcTrackModel,
  BasicTrack,
  BasicTrackModel,
  Cell,
  Clade,
  CladeMark,
  ColorEncoding,
  ColorEncodingChannel,
  ColorScheme,
  ColumnTrackEncoding,
  ColumnTrackSpec,
  DomainBand,
  Encoding,
  EncodingChannel,
  Feature,
  FeatureEncodingSpec,
  FieldChannel,
  Highlight,
  LabelEncoding,
  Legend,
  LegendEntry,
  MsaSelection,
  Node,
  MappedStructure,
  NodeWithIds,
  NodeWithIdsAndLength,
  Region,
  ResidueEncoding,
  ResidueMapping,
  ResidueMappingProblem,
  ResidueSegment,
  ResolvedClade,
  ResolvedEncoding,
  ResolvedHighlight,
  ResolvedRowPanel,
  ResolvedSelection,
  RowDataInput,
  RowFeaturesSpec,
  RowPanelSpec,
  RowStripSpec,
  RowResidue,
  StructureResidue,
  TextTrackModel,
  TidyDomainAnnotation,
  TrackKind,
  TreeOrder,
  TreeRoot,
  UnshareableData,
  Viewport,
} from './types.ts'

import type { ResolvedScale, ScaleSpec } from './scales.ts'
import type { Annotation } from 'msa-parsers'

export interface Accession {
  accession: string
  name: string
  description: string
}
// every kind draws into the same per-column space; drawTracks.ts dispatches on
// it to pick the draw function
export type TrackKind = 'text' | 'bar' | 'logo' | 'arc' | 'ruler'

/**
 * Which channel the color scheme paints. `fill` colors the cell a residue sits
 * in, `color` colors the letter itself, the same distinction a grammar of
 * graphics draws between a shape's interior and its own ink.
 */
export type ResidueEncoding = 'fill' | 'color'

/**
 * The residue colors: a scheme name from the built-in table, or a scale's
 * `{map}` of letter to color, which leaves every letter it does not list
 * uncolored
 */
export type ColorScheme = string | Required<Pick<ScaleSpec, 'map'>>

export interface BasicTrackModel {
  id: string
  name: string
  associatedRowName?: string
  height: number
  kind: TrackKind
  // the model height this track's divider writes, shared with every track
  // carrying the same key. Absent on a track no divider resizes.
  heightKey?: string
  // hidden until the user asks for it, unless they have already chosen
  defaultOff?: boolean
}

export interface TextTrackModel extends BasicTrackModel {
  customColorScheme?: Record<string, string>
  data?: string
}

// a track that draws a per-column bar chart (conservation, property
// conservation)
export interface BarTrackModel extends BasicTrackModel {
  barColor?: string
}

// a pair of columns joined by an arc, resolved to 0-based visible columns for
// the renderer
export interface Arc {
  start: number
  end: number
  color?: string
}

// a track that joins pairs of columns with arcs (RNA base pairs, disulfide
// bonds, residue contacts)
export interface ArcTrackModel extends BasicTrackModel {
  arcs?: Arc[]
  arcColor?: string
}

export interface BasicTrack {
  ReactComponent: React.FC<any>
  model: TextTrackModel & BarTrackModel & ArcTrackModel
}

// one arc of an arc track, in the snapshot's own coordinates: 1-based and
// inclusive, alignment columns unless the track names a `row`
export interface ArcSpec {
  start: number
  end: number
  color?: string
}

// a track supplied as data in the snapshot rather than computed from the
// alignment. `values` (bar) or `data` (text) index alignment columns, or the
// 1-based residues of `row` when it names one; `arcs` (arc) name two such
// positions each
export interface ColumnTrackSpec {
  id: string
  name: string
  kind: 'bar' | 'text' | 'arc'
  values?: number[]
  data?: string
  arcs?: ArcSpec[]
  max?: number
  color?: string
  colors?: Record<string, string>
  row?: string
  height?: number
}

/**
 * A strip panel: one cell per row, colored from a `rowData` field through
 * `scale`, which is ggtree's `gheatmap`. `width` is in pixels and defaults to
 * the row height, and `header` labels the column and defaults to the field.
 * `legend` titles the strip's legend and defaults to the field, and strips
 * naming one title share one legend.
 */
export interface RowStripSpec {
  kind: 'strip'
  field: string
  scale?: ScaleSpec
  width?: number
  header?: string
  legend?: string
}

/** the channels a `features` panel reads off the feature table */
export interface FeatureEncodingSpec {
  color?: { field: string; scale?: ScaleSpec }
  label?: string
}

/**
 * Shifts each row so that the first feature named `on` starts at zero, which
 * is gggenes' `make_alignment_dummies`. Only `x: "position"` reads it.
 */
export interface AlignTransform {
  type: 'align'
  on: string
}

/**
 * A features panel: the GFF's spans per row, as arrows where they carry a
 * strand. `x: "column"` draws them in the alignment's columns, and
 * `x: "position"` in each row's own residue positions on one linear scale, so
 * a genome with no alignment has an x.
 */
export interface RowFeaturesSpec {
  kind: 'features'
  x: 'column' | 'position'
  width?: number
  header?: string
  encoding?: FeatureEncodingSpec
  transform?: AlignTransform[]
  /** how overlapping features share the row's height; see docs/layers.md */
  position?: 'identity' | 'strandpile'
}

/**
 * A panel left of the alignment on the row scale, the counterpart of
 * ColumnTrackSpec on the column scale. See docs/layers.md
 */
export type RowPanelSpec = RowStripSpec | RowFeaturesSpec

interface ResolvedPanelBase {
  id: string
  header: string
  width: number
  offsetX: number
  legend: LegendEntry[]
  /** the legend this panel's entries go under; absent means the domain key */
  legendTitle?: string
}

/**
 * A strip with its scale resolved: the color each row takes, keyed by row
 * name, and the pixel column the panel draws in.
 */
export interface ResolvedStripPanel extends ResolvedPanelBase {
  kind: 'strip'
  field: string
  colors: Map<string, string>
}

/** one feature of a features panel, at its pixel span inside the panel */
export interface RowPanelSpan {
  annotation: Annotation
  xStart: number
  xEnd: number
  lane: number
  laneCount: number
}

/**
 * A features panel with its x mapping and its scale resolved: the spans per
 * row name in panel pixels, the fill and outline of each feature, and the
 * label its `label` channel draws. `field` is the field its color scale reads,
 * which its legend is titled by.
 */
export interface ResolvedFeaturePanel extends ResolvedPanelBase {
  kind: 'features'
  x: 'column' | 'position'
  field?: string
  spans: Map<string, RowPanelSpan[]>
  colors: Map<Annotation, { fill: string; stroke: string }>
  labels?: Map<Annotation, string>
}

export type ResolvedRowPanel = ResolvedStripPanel | ResolvedFeaturePanel

// One contiguous run where a row's residues and a structure's line up 1:1, as
// SIFTS reports them. A position no segment covers is unmapped.
export interface ResidueSegment {
  rowStart: number
  rowEnd: number
  structStart: number
  structEnd: number
}

// the structure half of a mapping. `id` is whatever the producer calls the
// entry (a PDB id, an AlphaFold accession); `asymId` names the chain and
// distinguishes two mappings onto the same entry
export interface MappedStructure {
  id: string
  kind?: 'experimental' | 'predicted'
  asymId?: string
  url?: string
}

/**
 * The structure residue for each residue of a row, computed outside the viewer
 * (SIFTS, an AlphaFold model, a curator). Sequence equality misplaces tagged
 * constructs, truncations and subsequence rows; see docs/layers.md.
 *
 * Positions are 1-based and inclusive on both sides, as GFF and `highlights`
 * are. Structure positions are `label_seq_id`, the index into the entity's
 * SEQRES; author numbering carries insertion codes and is not used.
 *
 * `unobserved` is in structure positions: present in SEQRES with no
 * coordinates, as distinct from a residue the structure lacks.
 */
export interface ResidueMapping {
  row: string
  accession?: string
  structure: MappedStructure
  segments: ResidueSegment[]
  unobserved?: [number, number][]
  /**
   * ungapped length of the row this was computed against. When set, the viewer
   * ignores the mapping if the loaded row's length differs, as it does after a
   * re-alignment, revision or swapped sequence.
   */
  rowLength?: number
  generated?: {
    by?: string
    date?: string
    sourceSha256?: string
  }
}

// why a mapping, or one segment of it, is ignored, so a host can tell "no
// structure for this row" from "the mapping no longer matches what is loaded"
export interface ResidueMappingProblem {
  row: string
  structureId: string
  /**
   * `mapping` ignores the whole mapping, because the problem concerns its row.
   * `segment` ignores only that segment and keeps the rest.
   */
  scope: 'mapping' | 'segment'
  reason: string
}

// a lookup result in either direction. `observed` is false for a residue in
// SEQRES with no coordinates.
export interface StructureResidue {
  structure: MappedStructure
  position: number
  observed: boolean
}

export interface RowResidue {
  rowName: string
  seqPos: number
}

/**
 * One loaded document that the snapshot omits, and its size. `what` uses the
 * import form's names for the documents.
 */
export interface UnshareableData {
  what: 'alignment' | 'tree' | 'annotations' | 'row metadata' | 'data tracks'
  bytes: number
}

// Annotation is defined in msa-parsers. Downstream plugins' emitted
// declarations still name TidyDomainAnnotation.
export type { Annotation }
export type TidyDomainAnnotation = Annotation

// an annotation resolved to the visible column span it is drawn across.
// stackIndex is its position in its row's paint order; lane is the sub-row it
// occupies, out of the laneCount the row's overlaps need.
export interface DomainBand {
  annotation: Annotation
  startCol: number
  endCol: number
  stackIndex: number
  lane: number
  laneCount: number
}

/**
 * One swatch of a categorical color key. `id` is the value the scale read, and
 * `label` is the text drawn beside the swatch.
 */
export interface LegendEntry {
  id: string
  label: string
  color: string
}

/**
 * A categorical color key, drawn by the on-screen overlay and reserved as a
 * column in the SVG export. `title` names the legend where the viewer draws
 * more than one.
 */
export interface Legend {
  id: string
  title: string
  entries: LegendEntry[]
}

/**
 * A persistent, labeled highlight. Coordinates are 1-based and inclusive, as
 * GFF's are. `row` makes `start`/`end` residues of that row; without it they
 * are alignment columns. `rows` marks whole rows instead.
 */
export interface Highlight {
  row?: string
  rows?: string[]
  start?: number
  end?: number
  label?: string
  color?: string
}

/**
 * What the viewer draws over a clade. `highlight` fills the rows behind it,
 * across the tree and the alignment. `bracket` draws a bar and the clade's
 * `label` in the gutter right of the tip labels. `collapse`, `focus` and
 * `rotate` seed the collapsed list, the subtree in focus and the rotated nodes
 * at load.
 */
export type CladeMark =
  | 'highlight'
  | 'bracket'
  | 'collapse'
  | 'focus'
  | 'rotate'

/**
 * The order each node's children draw in, top to bottom. `branchLength` puts
 * the shortest branch first, `input` keeps the file's order, `ladderize` puts
 * the clade with the fewest tips first, so the deep clades step down toward
 * the bottom, and `ladderizeReverse` puts the one with the most tips first.
 */
export type TreeOrder =
  | 'branchLength'
  | 'input'
  | 'ladderize'
  | 'ladderizeReverse'

/**
 * Where the tree is rooted: `midpoint` halfway along the longest path between
 * two tips, and `{outgroup}` on the branch above those tips' most recent common
 * ancestor, or above the rest of the tips' where the outgroup straddles the
 * root the file gives.
 */
export type TreeRoot = 'midpoint' | { outgroup: string[] }

/**
 * A clade of the tree and the mark drawn over it. `mrca` names tips whose most
 * recent common ancestor is the clade; `range` names the first and last tip of
 * a run in display order, in either order. `tips` is the leaf count the
 * producer measured, and a clade that resolves to a different count is dropped.
 * `label` names the clade beside a bracket, and a highlight carrying one draws
 * the label without the bar. See docs/layers.md
 */
export interface Clade {
  mrca?: string[]
  range?: [string, string]
  tips: number
  mark: CladeMark
  color?: string
  label?: string
}

/**
 * A Clade resolved to the rows it covers, with its fill color settled. `color`
 * is the highlight fill; `markColor` is the producer's own color for a bracket
 * bar and its label, unset where the theme's text color stands. `nodeId` is the
 * node an `mrca` resolved to, which `collapse` and `focus` seed themselves
 * with, and a `range` record has none.
 */
export interface ResolvedClade {
  rows: [number, number]
  mark: CladeMark
  color: string
  markColor?: string
  label?: string
  nodeId?: string
}

/**
 * A span in Highlight coordinates: 1-based inclusive residues of `row`, or
 * columns of the file without it
 */
export interface Region {
  row?: string
  start: number
  end: number
}

/**
 * A block of the alignment the reader selected: columns `start` to `end` of the
 * file, 1-based and inclusive like a Highlight without a row, across the rows
 * `rows` names, or across every row where `rows` is absent.
 */
export interface MsaSelection {
  start: number
  end: number
  rows?: string[]
}

/**
 * An MsaSelection resolved to what is on screen: the visible columns it covers
 * and its rows as runs of consecutive row indices, top to bottom
 */
export interface ResolvedSelection {
  startCol: number
  endCol: number
  rowRuns: [number, number][]
}

/**
 * A cell of the alignment in the host's coordinates, 1-based like Highlight:
 * `column` counts every column of the file, hidden gappy ones included, and
 * `residue` counts the row's own letters, absent on a gap. `letter` is the
 * character in the cell, the gap character (`-` or `.`) on a gap. A pointer
 * over a track has a column and no row.
 */
export interface Cell {
  column: number
  row?: string
  residue?: number
  letter?: string
}

/** the alignment columns on screen, 1-based and inclusive */
export interface Viewport {
  startColumn: number
  endColumn: number
}

/**
 * A channel of a mark the viewer always draws. `tipLabel` colors each tip label
 * in the tree, `rowTint` washes the row across the tree gutter and the
 * alignment, and `branch` colors a tree edge whose tips all share one value;
 * all three read a field of `rowData`. `featureFill` colors each span of the
 * annotation overlay and `featureLabel` names the field drawn inside a span,
 * both from a field of the feature table.
 */
export type EncodingChannel =
  | 'tipLabel'
  | 'rowTint'
  | 'branch'
  | 'featureFill'
  | 'featureLabel'

/**
 * A channel, the field feeding it, and the scale it reads that field through.
 * See docs/layers.md
 */
export interface Encoding {
  channel: EncodingChannel
  field: string
  scale?: ScaleSpec
}

/** an Encoding with its scale resolved against the values in the table */
export type ResolvedEncoding = Encoding & ResolvedScale

/** a Highlight resolved to visible column indices and row indices */
export interface ResolvedHighlight {
  startCol?: number
  endCol?: number
  rowIndices: number[]
  label?: string
  color?: string
}

export interface Node {
  children?: Node[]
  name?: string
}

export interface NodeWithIds {
  id: string
  name: string
  children: NodeWithIds[]
  length?: number
  noTree?: boolean
}

/** @deprecated the same type as `NodeWithIds` */
export type NodeWithIdsAndLength = NodeWithIds

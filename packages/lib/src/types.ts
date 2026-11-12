import type { TickFormat, ValueScale } from './components/axis.ts'
import type { LegendItem } from './legendSpec.ts'
import type {
  ColorChannel,
  ColorSpec,
  ColorValue,
  SharedScale,
} from './scales.ts'
import type { Annotation } from 'msa-parsers'

export interface Accession {
  accession: string
  name: string
  description: string
}
// every kind draws into the same per-column space; drawTracks.ts dispatches on
// it to pick the draw function
export type TrackKind =
  | 'text'
  | 'bar'
  | 'logo'
  | 'arc'
  | 'ruler'
  | 'reference'
  | 'highlights'
  | 'features'
  | 'strip'

export interface BasicTrackModel {
  id: string
  name: string
  height: number
  kind: TrackKind
  // the model height this track's divider writes, shared with every track
  // carrying the same key. Absent on a track no divider resizes.
  heightKey?: string
}

export interface TextTrackModel extends BasicTrackModel {
  customColorScheme?: Record<string, string>
  data?: string
}

// a track that draws a per-column bar chart (conservation, property
// conservation), or a strip of one cell per column. `columnColors` holds the
// color of each visible column's bar or cell where a scale colors them.
export interface BarTrackModel extends BasicTrackModel {
  barColor?: string
  columnColors?: (string | undefined)[]
}

// a pair of columns joined by an arc, resolved to 0-based visible columns for
// the renderer
export interface Arc {
  start: number
  end: number
  color?: string
  value?: number
}

// a track that joins pairs of columns with arcs (RNA base pairs, disulfide
// bonds, residue contacts)
export interface ArcTrackModel extends BasicTrackModel {
  arcs?: Arc[]
  arcColor?: string
}

/**
 * A bracket-mark highlight placed in the highlight strip: its `key` in
 * `resolvedHighlights`, its visible columns, and the lane it stacks into.
 * `nextStartCol` is where the next bracket in its lane starts, as far as its
 * label may run.
 */
export interface HighlightBand {
  key: string
  startCol: number
  endCol: number
  lane: number
  nextStartCol?: number
  label?: string
  color?: string
}

// labeled brackets over the columns each highlight covers, one lane per level
// of overlap
export interface HighlightTrackModel extends BasicTrackModel {
  bands?: HighlightBand[]
}

/**
 * One span of a features track at the visible columns it covers, `endCol`
 * exclusive, and the lane it packs into out of the `laneCount` the track's
 * overlaps need
 */
export interface ColumnSpan {
  annotation: Annotation
  startCol: number
  endCol: number
  lane: number
  laneCount: number
}

// spans over columns, drawn as boxes or strand arrows and packed into lanes
// where they overlap
export interface FeatureTrackModel extends BasicTrackModel {
  spans?: ColumnSpan[]
}

export interface BasicTrack {
  model: TextTrackModel &
    BarTrackModel &
    ArcTrackModel &
    HighlightTrackModel &
    FeatureTrackModel
}

// one arc of an arc track, in the snapshot's own coordinates: 1-based and
// inclusive, alignment columns unless the track names a `row`. `value`, such
// as a contact probability, is what the track's `encoding.color` reads, and
// the arc's own `color` wins over it.
export interface ArcSpec {
  start: number
  end: number
  color?: string
  value?: number
}

/**
 * One span of a features track, in the snapshot's own coordinates: 1-based and
 * inclusive, alignment columns unless the track names a `row`. A `strand` draws
 * it as an arrow, its own `color` wins over any scale, and every field but
 * `start` and `end` is one the track's encoding can read.
 */
export interface SpanSpec {
  start: number
  end: number
  name?: string
  description?: string
  /** a GFF feature type; `exon`, `CDS` and the UTRs draw as numbered segments */
  type?: string
  strand?: '+' | '-'
  color?: string
  [field: string]: string | number | undefined
}

/**
 * The channels a column track reads. `y.scale` maps a bar's value onto its
 * height. `color` is one color as `{value}`, or else reads the track's own
 * values through its `scale`: a bar's or a strip's numbers, an arc's `value`,
 * a text track's upper-case characters, painted on the channel `residueColor`
 * names. A features track reads `fill` and `text` off its
 * spans' fields.
 */
export interface ColumnTrackEncoding extends FeatureEncodingSpec {
  color?: ColorSpec
  y?: { scale?: ValueScaleSpec }
}

// a track supplied as data in the snapshot rather than computed from the
// alignment. `values` (bar, strip) or `data` (text) index alignment columns,
// or the 1-based residues of `row` when it names one; `arcs` (arc) name two
// such positions each, and `features` (features) the two ends of a span.
// `color` is shorthand for `encoding.color: {value}` on a bar, text or arc
// track and for `encoding.fill: {value}` on a features track, read while that
// member is unset.
export interface ColumnTrackSpec {
  id: string
  name: string
  kind: 'bar' | 'strip' | 'text' | 'arc' | 'features'
  values?: number[]
  data?: string
  arcs?: ArcSpec[]
  features?: SpanSpec[]
  color?: string
  encoding?: ColumnTrackEncoding
  /** how a features track's overlapping spans share its height */
  position?: FeaturePosition
  row?: string
  height?: number
}

/** a channel fed by a field, with no scale between them */
export interface FieldChannel {
  field: string
}

/**
 * A strip panel: one cell per row, its `fill` read from a `rowData` field
 * through a color object, which is ggtree's `gheatmap`. `width` is in pixels
 * and defaults to the row height, and `header` labels the column and defaults
 * to the field. Strips declaring the same scale and legend title share one
 * scale and one legend.
 */
export interface RowStripSpec {
  kind: 'strip'
  encoding: { fill: ColorChannel }
  width?: number
  header?: string
}

/**
 * The channels a `features` panel reads off the feature table: the `fill` of
 * each span, one color as `{value}` or a field through a scale, and the
 * `text` drawn inside it
 */
export interface FeatureEncodingSpec {
  fill?: ColorChannel | ColorValue
  text?: FieldChannel
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
  position?: FeaturePosition
}

/**
 * How overlapping spans share a row's or a track's height: `identity` packs
 * them into lanes, and `strandpile` packs each strand on its own, the forward
 * spans above the reverse ones
 */
export type FeaturePosition = 'identity' | 'strandpile'

/**
 * The scale a bar or point mark reads a number through into a length: `linear`
 * (the default) or `log`, each end pinned by `domainMin` or `domainMax` or
 * following the values, clipped at the nearest-rank `domainQuantile` (0.5 to
 * 1, the default the extremes)
 */
export interface ValueScaleSpec {
  type?: 'linear' | 'log'
  domainMin?: number
  domainMax?: number
  domainQuantile?: number
}

/** a channel reading a numeric field through a value scale */
export interface ValueChannel {
  field: string
  scale?: ValueScaleSpec
}

interface RowValueSpec {
  encoding: { x: ValueChannel; color?: ColorChannel }
  width?: number
  header?: string
}

/**
 * A bar per row, from the panel's left edge to its `x` field's value through
 * `encoding.x.scale`, filled through `encoding.color` where one is set, which
 * is ggtree's `geom_facet(geom_col)`. `width` defaults to 80, and `header`,
 * the title of the axis the header band draws, to the field. A linear scale
 * with no `domainMin` starts at 0.
 */
export interface RowBarSpec extends RowValueSpec {
  kind: 'bar'
}

/**
 * A dot per row at its `x` field's value, as a `bar` reads it, `size` pixels
 * across (6 by default, at most the row height): ggtree's
 * `geom_facet(geom_point)`
 */
export interface RowPointSpec extends RowValueSpec {
  kind: 'point'
  size?: number
}

/**
 * A `rowData` field printed beside each row in the panel's width, colored
 * through `encoding.color` where one is set. `width` defaults to 80, and
 * `header` to the field.
 */
export interface RowTextSpec {
  kind: 'text'
  encoding: { text: FieldChannel; color?: ColorChannel }
  width?: number
  header?: string
}

/**
 * A panel left of the alignment on the row scale, the counterpart of
 * ColumnTrackSpec on the column scale. See docs/layers.md
 */
export type RowPanelSpec =
  | RowStripSpec
  | RowFeaturesSpec
  | RowBarSpec
  | RowPointSpec
  | RowTextSpec

/**
 * The guide of a panel's value scale, which the header band draws: the scale,
 * the panel pixels of its low and high ends, and how a tick is labeled
 */
export interface PanelAxis {
  scale: ValueScale
  extent: readonly [number, number]
  format: TickFormat
}

interface ResolvedPanelBase {
  id: string
  header: string
  width: number
  offsetX: number
  axis?: PanelAxis
  legend: LegendItem[]
  /** the scale this panel's entries list under; absent means the domain key */
  legendKey?: string
  legendTitle?: string
  legendNote?: string
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

/**
 * A bar or point panel with its scales resolved: each row's value, the color
 * `encoding.color` gives it (none where the record sets no color), and the
 * axis its value scale draws. `colorField` is the field the color reads, and
 * `hiddenRows` the rows whose value of it a legend click hid, which draw no
 * mark.
 */
export interface ResolvedValuePanel extends ResolvedPanelBase {
  kind: 'bar' | 'point'
  field: string
  colorField?: string
  values: Map<string, number>
  colors: Map<string, string>
  hiddenRows: Set<string>
  size: number
  axis: PanelAxis
}

/**
 * A text panel with each row's text and the color `encoding.color` gives it.
 * A row in `hiddenRows` holds a color value a legend click hid, and prints
 * nothing.
 */
export interface ResolvedTextPanel extends ResolvedPanelBase {
  kind: 'text'
  field: string
  colorField?: string
  texts: Map<string, string>
  colors: Map<string, string>
  hiddenRows: Set<string>
}

export type ResolvedRowPanel =
  | ResolvedStripPanel
  | ResolvedFeaturePanel
  | ResolvedValuePanel
  | ResolvedTextPanel

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
  /**
   * which id `asymId` is, the file's `label_asym_id` or the author's
   * `auth_asym_id`. Unset reads as either, label first, which is right for the
   * common entry whose two ids agree and wrong where they collide.
   */
  asymIdKind?: 'label' | 'auth'
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
 * A persistent, labeled highlight. Coordinates are 1-based and inclusive, as
 * GFF's are. `row` makes `start`/`end` residues of that row; without it they
 * are alignment columns. `rows` marks whole rows instead.
 */
/**
 * How a column-span highlight draws. `band` fills its columns across the
 * alignment, with its label in a box at the top. `bracket` outlines them and
 * draws a labeled bracket in a strip above the alignment, packed into lanes so
 * nested highlights stay apart, and leaves the residue colors unchanged.
 */
export type HighlightMark = 'band' | 'bracket'

export interface Highlight {
  row?: string
  rows?: string[]
  start?: number
  end?: number
  label?: string
  color?: string
  mark?: HighlightMark
}

/**
 * A feature on one row as data, the JSON form of a GFF line: `start` and `end`
 * are residues of `row`, 1-based and inclusive. `name` is the key the legend,
 * the palette and the filter dialog group features by, `color` overrides the
 * palette and any scale, and a `strand` draws the span as an arrow. Every other
 * field is a column the `featureFill` and `featureLabel` encodings can read.
 */
export interface Feature extends SpanSpec {
  row: string
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
 * A test a row's `rowData` field passes: `oneOf` lists the values kept, and
 * `range` the inclusive numeric bounds, either end `null` for open. A row with
 * no value for the field fails both.
 */
export type RowFilter =
  | { field: string; oneOf: (string | number | boolean)[] }
  | { field: string; range: [number | null, number | null] }

/** a sort key over a `rowData` field, ascending unless `order` says not */
export interface RowSort {
  field: string
  order?: 'ascending' | 'descending'
}

/**
 * Bands of rows by a `rowData` field, each labelled with its value. `sort`
 * lists the values whose bands come first.
 */
export interface RowFacet {
  field: string
  sort?: string[]
}

/**
 * The row axis's transforms over `rowData`: `filter` keeps the rows passing
 * every test, `sort` orders the rows where no tree does, and `facet` bands
 * them. See docs/layers.md
 */
export interface RowTransform {
  filter?: RowFilter[]
  sort?: RowSort[]
  facet?: RowFacet
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
 * A row table as a host passes it: fields per row name. A number or a boolean
 * reads as its string, the way a GFF value does, and the viewer leaves out any
 * other value. See docs/layers.md
 */
export type RowDataInput = Record<
  string,
  Record<string, string | number | boolean | null>
>

/**
 * A color channel of a mark the viewer always draws. `tipLabel` colors each tip
 * label in the tree, `rowTint` washes the row across the tree gutter and the
 * alignment, and `branch` colors a tree edge whose tips all share one value;
 * all three read a field of `rowData`. `featureFill` colors each span of the
 * annotation overlay from a field of the feature table. `nodePoint` fills the
 * bubble on each internal node of the tree from its `support` field, the label
 * the Newick file gives the node.
 */
export type ColorEncodingChannel =
  | 'tipLabel'
  | 'rowTint'
  | 'branch'
  | 'featureFill'
  | 'nodePoint'

/**
 * A channel of a mark the viewer always draws: a color channel,
 * `featureLabel`, the field of the feature table drawn inside each span, or
 * `rowLabel`, the field of `rowData` drawn as each tip's label
 */
export type EncodingChannel = ColorEncodingChannel | LabelEncoding['channel']

/**
 * A color channel, the field feeding it, and the color object's members it
 * reads that field through. See docs/layers.md
 */
export interface ColorEncoding extends ColorChannel {
  channel: ColorEncodingChannel
}

/** a text channel and the field it draws */
export interface LabelEncoding extends FieldChannel {
  channel: 'featureLabel' | 'rowLabel'
}

/**
 * A value of a field the reader turned off in a legend, jbrowse-components'
 * ADR-246. It applies wherever a categorical scale reads `field`: a row's
 * marks draw unpainted, and a feature leaves the overlay, the panels and the
 * tracks.
 */
export interface HiddenCategory {
  field: string
  value: string
}

export type Encoding = ColorEncoding | LabelEncoding

/** a ColorEncoding with its scale resolved against the values in the table */
export type ResolvedEncoding = Pick<ColorEncoding, 'channel' | 'field'> &
  SharedScale

/** a Highlight resolved to visible column indices and row indices */
export interface ResolvedHighlight {
  startCol?: number
  endCol?: number
  rowIndices: number[]
  label?: string
  color?: string
  row?: string
  start?: number
  end?: number
  mark: HighlightMark
  // set by host code through applyHighlight, outside the snapshot. Always a
  // band, so a highlight that follows the pointer never reflows the strip
  transient: boolean
  // the same for the same record across recomputes, which a position in the
  // list is not once a span lands on hidden columns
  key: string
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

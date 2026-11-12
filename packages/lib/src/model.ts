import { preorder } from '@gmod/newick'
import { clamp, groupBy, notEmpty, sum } from '@jbrowse/core/util'
import { ElementId, FileLocation } from '@jbrowse/core/util/types/mst'
import {
  addDisposer,
  applySnapshot,
  cast,
  getSnapshot,
  isStateTreeNode,
  types,
} from '@jbrowse/mobx-state-tree'
import {
  autorun,
  compareStructural,
  computed,
  reaction,
  transaction,
} from 'mobx'
import {
  buildSeqPosIndex,
  globalColToVisibleCol,
  seqPosOfGlobalCol,
  visibleColToGlobalCol,
  visibleColsBefore,
} from 'msa-coordinates'
import {
  annotationTextToGFF,
  generateNodeIds,
  gffToAnnotations,
  parseGFF,
  parseMSA,
  parseTree,
} from 'msa-parsers'

import { blockFasta } from './blockFasta.ts'
import { calculateBlocks } from './calculateBlocks.ts'
import { clustalXColumnColors } from './clustalX.ts'
import colorSchemes, { letterColorTable } from './colorSchemes.ts'
import {
  columnCountsFromRows,
  letterOfResidueSlot,
  lettersInRows,
} from './columnCounts.ts'
import { columnStats } from './columnStats.ts'
import {
  finiteNumber,
  letterValue,
  numberText,
  paintableColor,
  trackColorChannel,
  trackColorValues,
  trackConstantColor,
} from './columnTrackColor.ts'
import { valuePosition } from './components/axis.ts'
import { packDomainLanes } from './components/msa/packDomainLanes.ts'
import { visibleColRange } from './components/msa/visibleColRange.ts'
import {
  highlightTrackHeight,
  packHighlightBands,
} from './components/tracks/highlightBands.ts'
import { cladeGutterWidth } from './components/tree/cladeBrackets.ts'
import { scaleBarLength } from './components/tree/scaleBar.ts'
import {
  defaultAllowedGappyness,
  defaultColWidth,
  defaultColorSchemeName,
  defaultCurrentAlignment,
  defaultDrawMsaLetters,
  defaultHeight,
  defaultHideGaps,
  defaultRowHeight,
  defaultScrollX,
  defaultScrollY,
  defaultScrollZoom,
  defaultScrollZoomAxis,
  defaultShowDomainLegend,
  defaultShowDomains,
  domainFills,
  defaultSubFeatureRows,
  fontSizeFor,
  labelFitFontSize,
  maxCellSize,
  maxFitTreeWidth,
  maxTreeAreaShare,
  maxInlineSnapshotBytes as defaultMaxInlineSnapshotBytes,
  maxNeighborJoiningRows,
  minColWidth,
  minLetterColWidth,
  minLetterRowHeight,
  isSiteType,
  minRowHeight,
  minTreeWidth,
  pxPerTreeDepth,
  resizeHandleWidth,
  rowPanelHeaderHeight,
  rowTintAlpha,
  scrollZoomAxes,
  segmentFeatureTypes,
  segmentShades,
  settingsPanelWidth,
  siteFills,
  treeScaleBarHeight,
} from './constants.ts'
import { createPaletteMap } from './createPaletteMap.ts'
import { exportFileName } from './exportFileName.ts'
import { featureName, featureValues } from './featureFields.ts'
import {
  colorByRow,
  featureColorMap,
  featureLabelMap,
  UNSCALED_FEATURE,
  featurePanelSpans,
  panelLanes,
  rowPanelWidth,
  stringFields,
} from './featurePanels.ts'
import { featuresToAnnotations, trackAnnotations } from './featuresLayer.ts'
import { installFilehandleLoader } from './filehandleLoader.ts'
import {
  activeHiddenValues,
  categoryHiddenIn,
  featureHidden,
  toggledCategories,
} from './hiddenCategories.ts'
import {
  find,
  hierarchy,
  layoutTree,
  leaves,
  nodeCoveringRows,
} from './hierarchy.ts'
import { DataModelF } from './model/DataModel.ts'
import { DialogQueueSessionMixin } from './model/DialogQueue.ts'
import { MSAModelF } from './model/msaModel.ts'
import { TreeModelF } from './model/treeModel.ts'
import { calculateNeighborJoiningTree } from './neighborJoining.ts'
import { calculatePropertyConservation } from './propertyConservation.ts'
import { liftResidueColor, resolveResidueColor } from './residueColor.ts'
import {
  arrangeRows,
  bandsNotClades,
  facetClades,
  passesFilters,
  pruneTree,
  tipNames,
} from './rowTransform.ts'
import { colorProblems, valueScaleProblems } from './scaleProblems.ts'
import {
  constantColor,
  declarationKey,
  fieldChannel,
  isCategorical,
  resolveShared,
  scaleKind,
} from './scales.ts'
import { maxBitsFor } from './sequenceLogo.ts'
import {
  blosum62ColumnColors,
  identityColumnColors,
} from './similarityColors.ts'
import { stripDefault } from './stripDefault.ts'
import { treeTips, widestLabel } from './tipLabels.ts'
import {
  buildTreeRoot,
  nodeField,
  outgroupNode,
  resolveClades,
  rootTree,
  seedingMarks,
  tipRange,
} from './treeDisplay.ts'
import {
  blanksWithin,
  computeRowInsertions,
  clampedSpan,
  consecutiveRuns,
  devicePixelRatioQuery,
  dropBlanks,
  len,
  nonEmpty,
  readComputed,
  skipBlanks,
  trimBlanks,
  withAlpha,
} from './util.ts'
import {
  barTrackScale,
  defaultPointSize,
  resolveValueScale,
  rowNumbers,
  rowsHolding,
  rowTexts,
  valuePanelAxis,
} from './valuePanels.ts'
import { saveAs } from './vendor/fileSaver.ts'
import { writeNewick } from './writeNewick.ts'
import { parseWuss } from './wuss.ts'
import { takeZoomSnapshot, zoomSnapshotCovers } from './zoomSnapshot.ts'

import type { ColumnStats } from './columnStats.ts'
import type { ValueScale } from './components/axis.ts'
import type { ScrollZoomAxis } from './constants.ts'
import type { HierarchyNode } from './hierarchy.ts'
import type { LegendHides, LegendItem, LegendSection } from './legendSpec.ts'
import type { ExportSvgOptions } from './renderToSvg.tsx'
import type { RecordScaleProblem } from './scaleProblems.ts'
import type {
  ColorChannel,
  ColorRecord,
  ScaleTable,
  ScaleUse,
  SharedScale,
} from './scales.ts'
import type {
  Annotation,
  Arc,
  BasicTrack,
  Cell,
  Clade,
  ResidueMappingProblem,
  ColumnSpan,
  ColumnTrackSpec,
  ColorEncoding,
  ColorEncodingChannel,
  DomainBand,
  Encoding,
  Feature,
  HiddenCategory,
  Highlight,
  MsaSelection,
  NodeWithIds,
  Region,
  ResidueMapping,
  ResidueSegment,
  ResolvedClade,
  ResolvedEncoding,
  ResolvedFeaturePanel,
  ResolvedStripPanel,
  ResolvedTextPanel,
  ResolvedValuePanel,
  ResolvedHighlight,
  ResolvedSelection,
  TreeRoot,
  ResolvedRowPanel,
  RowDataInput,
  RowPanelSpec,
  RowResidue,
  RowTransform,
  StructureResidue,
  TrackKind,
  UnshareableData,
  Viewport,
} from './types.ts'
import type { ZoomSnapshot } from './zoomSnapshot.ts'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { Instance } from '@jbrowse/mobx-state-tree'
import type { IComputedValue } from 'mobx'

// The height each kind draws at before the user drags a divider. A text track
// is absent: it is one alignment row tall and follows rowHeight, so the zoom
// controls already size it.
export const defaultTrackHeights: Partial<Record<TrackKind, number>> = {
  bar: 40,
  // taller than a bar track: in a 40px stack of four residues each glyph is
  // too short to identify. Twice the height of the tracks above it, so it
  // starts hidden
  logo: 80,
  arc: 50,
  ruler: 20,
  strip: 12,
}

// a features track is this tall per lane its overlapping spans pack into,
// which leaves a span room for an 11px label
const featureLaneHeight = 18

// the kinds a divider resizes. The ruler is a fixed scale, and a text track
// follows the vertical zoom.
const resizableKinds = new Set<TrackKind>([
  'bar',
  'logo',
  'arc',
  'features',
  'strip',
])

const defaultOffTracks = new Set(['sequence-logo', 'position-ruler'])

// a data track carries its own height rather than its kind's, so its divider
// resizes it alone
const ownHeightKey = (id: string) => `own:${id}`

// base-pair arcs: one color for nested helices, one for pseudoknots, which cross
// them
const HELIX_ARC = '#4e79a7'
const PSEUDOKNOT_ARC = '#e15759'

const columnTrackBytes = new WeakMap<ColumnTrackSpec, number>()

function columnTrackSize(track: ColumnTrackSpec) {
  let bytes = columnTrackBytes.get(track)
  if (bytes === undefined) {
    bytes = JSON.stringify(track).length
    columnTrackBytes.set(track, bytes)
  }
  return bytes
}

// a data track over this size stays in the live model but leaves the snapshot,
// the same rule DataModel applies to an inline document
function columnTrackSizes(tracks?: readonly ColumnTrackSpec[]) {
  return (tracks ?? []).map(columnTrackSize)
}

function smallColumnTracks(
  tracks: ColumnTrackSpec[] | undefined,
  maxInlineSnapshotBytes: number,
) {
  const sizes = columnTrackSizes(tracks)
  const kept = tracks?.filter((_t, i) => sizes[i]! <= maxInlineSnapshotBytes)
  return kept?.length ? { columnTracks: kept } : {}
}

/**
 * The snapshot properties reset() carries across a return to the import form:
 * display preferences and layout, nothing derived from the loaded file.
 *
 * reset() applies a default snapshot filtered to this list, so any property
 * left off it resets, including downstream composed ones (e.g. the jbrowse
 * plugin's). Node ids are path-derived (node-0-0-1), so a carried-over
 * `collapsed` or `showOnly` id would match a real node in the next tree and
 * fold it.
 *
 * Exported for modelReset.test.ts.
 */
export const preservedOnReset = new Set([
  'id',
  'type',
  'height',
  'drawMsaLetters',
  'scrollZoom',
  'scrollZoomAxis',
  'residueColor',
  'showColumnStats',
  'drawLabels',
  'labelsAlignRight',
  'treeAreaWidth',
  'treeWidth',
  'showBranchLen',
  'treeOrder',
  'drawTree',
  'drawNodeBubbles',
  'drawNodeLabels',
  'showTreeOverview',
  'overviewHeight',
  'turnedOffTracks',
  'trackHeights',
  'hideGaps',
  'allowedGappyness',
  'subFeatureRows',
  'showDomainLegend',
  'embeddedMode',
])

// `turnedOffTracks` holds only the user's explicit choices, so a hidden-by-default
// track writes nothing into the snapshot
function trackIsOff(
  turnedOffTracks: { get: (id: string) => boolean | undefined },
  id: string,
) {
  return turnedOffTracks.get(id) ?? defaultOffTracks.has(id)
}

// shared empty results, so observers don't see a fresh [] as a change
const noDomains: Annotation[] = []
const noClades: ResolvedClade[] = []

// `featureFill` reads the feature table, `nodePoint` the tree's internal
// nodes, and every other color channel rowData
function encodingTable({ channel }: ColorEncoding) {
  return channel === 'featureFill'
    ? 'features'
    : channel === 'nodePoint'
      ? 'nodes'
      : 'rows'
}

function isColorEncoding(encoding: Encoding): encoding is ColorEncoding {
  return encoding.channel !== 'featureLabel' && encoding.channel !== 'rowLabel'
}

// a scale's colorOf with the values the reader hid painting nothing
function unhiddenColorOf(
  colorOf: (value: string | undefined) => string | undefined,
  hidden: Set<string> | undefined,
) {
  return hidden
    ? (value: string | undefined) =>
        value !== undefined && hidden.has(value) ? undefined : colorOf(value)
    : colorOf
}

// seqPos -> column indexes per row, keyed on the parse so they are garbage
// collected with it. A computed would rebuild every row's index when read
// outside a reactive context.
// Newick tools write a colon in a name as an underscore, so a tree's row
// `chr1_100-200` is the GFF's `chr1:100-200`, as FastaMSA.getRow resolves it
function annotationRowName(
  id: string,
  rowNames: ReadonlySet<string> | ReadonlyMap<string, unknown>,
) {
  if (rowNames.has(id)) {
    return id
  }
  const underscored = id.replaceAll(':', '_')
  return rowNames.has(underscored) ? underscored : id
}

const seqPosIndexCache = new WeakMap<object, Map<string, Int32Array>>()

const inlineAnnotationCache = new WeakMap<object, Annotation[]>()

function inlineAnnotations(msa: { annotations: Annotation[] }) {
  const annotations = inlineAnnotationCache.get(msa) ?? msa.annotations
  inlineAnnotationCache.set(msa, annotations)
  return annotations
}

// A segment is a 1:1 run. A segment whose sides differ in length is malformed,
// and the lookups treat it like an uncovered position.
function sameLength(segment: ResidueSegment) {
  return (
    segment.rowEnd - segment.rowStart ===
    segment.structEnd - segment.structStart
  )
}

// A zoom that passes the default cell size stops on it, and one that starts on
// it holds there until the wheel has gathered `zoomDetent` worth of scale, so
// a zoom in or out finds its way back to the default
const zoomDetent = Math.log(1.3)

function detentZoom(
  value: number,
  scale: number,
  home: number,
  held: number,
  min: number,
  canHold: boolean,
) {
  if (value === home && canHold) {
    const total = held + Math.log(scale)
    return Math.abs(total) < zoomDetent
      ? { value, held: total }
      : { value: clamp(home * Math.exp(total), min, maxCellSize), held: 0 }
  }
  const next = clamp(value * scale, min, maxCellSize)
  return (value - home) * (next - home) < 0
    ? { value: home, held: 0 }
    : { value: next, held: 0 }
}

// fitting divides the viewport by the row or column count and multiplies back, so
// an exact fit can land a fraction of a pixel over. A plain `>` would then show
// a scrollbar that shrinks the viewport and leaves a gap.
function overflows(content: number, viewport: number) {
  return content - viewport > 0.5
}

function inRanges(ranges: [number, number][] | undefined, position: number) {
  return !!ranges?.some(([start, end]) => position >= start && position <= end)
}

// the value every one of a node's children reports, or undefined where one of
// them has no value or they disagree
function sharedValue(values: (string | undefined)[]) {
  const [first] = values
  return first !== undefined && values.every(v => v === first)
    ? first
    : undefined
}

type StripPanelScale = Omit<ResolvedStripPanel, 'id' | 'width' | 'offsetX'>
type FeaturePanelScale = Omit<
  ResolvedFeaturePanel,
  'id' | 'width' | 'offsetX' | 'spans'
>
type ValuePanelScale = Omit<
  ResolvedValuePanel,
  'id' | 'width' | 'offsetX' | 'axis'
> & { valueScale: ValueScale }
type TextPanelScale = Omit<ResolvedTextPanel, 'id' | 'width' | 'offsetX'>
type RowPanelScale =
  | StripPanelScale
  | FeaturePanelScale
  | ValuePanelScale
  | TextPanelScale

/**
 * #stateModel MsaView
 *
 * The main MSAView state model. Holds the loaded alignment, tree, and optional
 * overlay annotations, plus all display state (color scheme, zoom,
 * scroll, collapsed clades). It composes in members from `DialogQueueSessionMixin`,
 * `Tree`, and `MSAModel` (see Inherited members below). Data is loaded reactively
 * from the `msaFilehandle` / `treeFilehandle` / `gffFilehandle` properties, or set
 * directly with `setData`. Most state is persisted into the shareable URL.
 *
 * #example
 * ```js
 * import { MSAModelF } from 'react-msaview'
 * import { types } from '@jbrowse/mobx-state-tree'
 *
 * const RootModel = types.model({ view: types.optional(MSAModelF(), {}) })
 * const root = RootModel.create({})
 * root.view.setData({ msa: '>seq1\nACGT\n>seq2\nACGT' })
 * ```
 *
 * `maxInlineSnapshotBytes` is the largest pasted or local document, and the
 * largest data track, the snapshot keeps; a larger one stays in the live model
 * and `unshareableData` names it. The standalone app, whose links carry the
 * snapshot in the URL fragment, raises it.
 */
function stateModelFactory({
  maxInlineSnapshotBytes = defaultMaxInlineSnapshotBytes,
}: { maxInlineSnapshotBytes?: number } = {}) {
  return types
    .compose(
      DialogQueueSessionMixin(),
      TreeModelF(),
      MSAModelF(),
      types.model('MsaView', {
        /**
         * #property
         * id of view, randomly generated if not provided
         */
        id: ElementId,

        /**
         * #property
         */
        showDomains: stripDefault(types.boolean, defaultShowDomains),
        /**
         * #property
         * whether the domain legend is expanded. The legend floats over the
         * top-right of the alignment and covers residues, so a session or
         * figure can open with it collapsed.
         */
        showDomainLegend: stripDefault(types.boolean, defaultShowDomainLegend),
        /**
         * #property
         */
        hideGaps: stripDefault(types.boolean, defaultHideGaps),
        /**
         * #property
         * hide every column outside `selection`, the way `hideGaps` hides the
         * gappy ones. Without a selection every column shows.
         */
        trimToSelection: stripDefault(types.boolean, false),
        /**
         * #property
         */
        allowedGappyness: stripDefault(types.number, defaultAllowedGappyness),
        /**
         * #property
         */
        subFeatureRows: stripDefault(types.boolean, defaultSubFeatureRows),

        /**
         * #property
         * hardcoded view type
         */
        type: types.literal('MsaView'),

        /**
         * #property
         */
        drawMsaLetters: stripDefault(types.boolean, defaultDrawMsaLetters),

        /**
         * #property
         * draws the toolbar's menus and Settings as icons without text, for a
         * host with little room, such as a JBrowse view
         */
        embeddedMode: stripDefault(types.boolean, false),

        /**
         * #property
         * zoom in/out on plain mouse-wheel without holding ctrl
         */
        scrollZoom: stripDefault(types.boolean, defaultScrollZoom),

        /**
         * #property
         * which cell dimensions a wheel zoom scales, while `scrollZoom` is on
         */
        scrollZoomAxis: stripDefault(
          types.enumeration('ScrollZoomAxis', [...scrollZoomAxes]),
          defaultScrollZoomAxis,
        ),

        /**
         * #property
         * height of the div containing the view, px
         */
        height: stripDefault(types.number, defaultHeight),

        /**
         * #property
         * height of each row, px
         */
        rowHeight: stripDefault(types.number, defaultRowHeight),

        /**
         * #property
         * scroll position, Y-offset, px
         */
        scrollY: stripDefault(types.number, defaultScrollY),

        /**
         * #property
         * scroll position, X-offset, px
         */
        scrollX: stripDefault(types.number, defaultScrollX),

        /**
         * #property
         * width of columns, px
         */
        colWidth: stripDefault(types.number, defaultColWidth),

        /**
         * #property
         * filehandle object for the tree
         */
        treeFilehandle: types.maybe(FileLocation),

        /**
         * #property
         * filehandle object for the MSA (which could contain a tree e.g. with
         * stockholm files)
         */
        msaFilehandle: types.maybe(FileLocation),

        /**
         * #property
         * filehandle object for tree metadata
         */
        treeMetadataFilehandle: types.maybe(FileLocation),

        /**
         * #property
         * filehandle object for a GFF file of overlay annotations
         */
        gffFilehandle: types.maybe(FileLocation),

        /**
         * #property
         */
        currentAlignment: stripDefault(types.number, defaultCurrentAlignment),

        /**
         * #property
         * array of tree parent nodes that are 'collapsed' (all children are
         * hidden)
         */
        collapsed: stripDefault(types.array(types.string), []),

        /**
         * #property
         * tree nodes whose children draw in reverse order, which is ggtree's
         * `rotate`: the same tree, with the clades on either side of the node
         * swapped
         */
        rotated: stripDefault(types.array(types.string), []),

        /**
         * #property
         * where the tree is rooted: `midpoint` roots it halfway along the
         * longest path between two tips, `{outgroup}` on the branch above
         * the tips named, and undefined keeps the file's root
         */
        treeRoot: types.frozen<TreeRoot | undefined>(),

        /**
         * #property
         * focus on particular subtree
         */
        showOnly: types.maybe(types.string),
        /**
         * #property
         * whether the `collapse`, `focus` and `rotate` clade marks have
         * seeded `collapsed`, `showOnly` and `rotated`, so a restored snapshot
         * keeps what the reader changed after the seeding
         */
        cladesSeeded: stripDefault(types.boolean, false),
        /**
         * #property
         * the user's explicit show/hide choice per track id, keyed by id with
         * the value meaning "off". A track the user has never touched is absent
         * and falls back to its own default (see `defaultOffTracks`), so a
         * hidden-by-default track adds nothing to the shared URL.
         */
        turnedOffTracks: stripDefault(types.map(types.boolean), {}),

        /**
         * #property
         * the height of every track one divider resizes, keyed by `heightKey`:
         * the `kind` for the computed tracks, `own:<id>` for a data track. A
         * key is absent until the user drags that divider, and
         * `defaultTrackHeights` answers for it until then, so an untouched
         * viewer adds nothing to the shared URL.
         */
        trackHeights: stripDefault(types.map(types.number), {}),
        /**
         * #property
         * tracks supplied as data: per-column values drawn as bars, or a
         * per-column string drawn as a text track. See docs/layers.md
         */
        columnTracks: stripDefault(
          types.array(types.frozen<ColumnTrackSpec>()),
          [],
        ),

        /**
         * #property
         * row-to-structure residue correspondence, computed outside the viewer
         * (e.g. from SIFTS). Matching by sequence equality places a tagged
         * construct, a truncation or a subsequence row on the wrong residue.
         * See docs/layers.md
         */
        residueMappings: stripDefault(
          types.array(types.frozen<ResidueMapping>()),
          [],
        ),

        /**
         * #property
         * data from the loaded tree/msa/treeMetadata, generally loaded by
         * autorun
         */
        data: types.optional(DataModelF(maxInlineSnapshotBytes), {}),

        /**
         * #property
         * the user's departures from each annotation accession's default,
         * keyed by accession with the value meaning "off", like
         * `turnedOffTracks`. An untouched accession is absent and takes its
         * default, so the shared URL grows only with the user's filters
         */
        turnedOffFeatures: stripDefault(types.map(types.boolean), {}),
        /**
         * #property
         */
        relativeTo: types.maybe(types.string),
        /**
         * #property
         * declarative seed for the highlighted-columns overlay (visible column
         * indices). Unlike the volatile `highlightedColumns` (driven by
         * transient genome-hover sync), this persists in the snapshot/URL so a
         * shared link can open with specific columns highlighted. Applied once
         * in afterCreate.
         */
        highlightColumns: types.frozen<number[] | undefined>(),
        /**
         * #property
         * labeled highlights in 1-based inclusive coordinates: a column span
         * `{start, end}`, a residue span `{row, start, end}` of a named row,
         * or a row set `{rows}`, each with an optional `label` and `color`.
         * A span's `mark` is `band` (the default) or `bracket`, a labeled
         * bracket in the strip above the alignment. Persists in the snapshot
         * and the URL.
         */
        highlights: stripDefault(types.array(types.frozen<Highlight>()), []),
        /**
         * #property
         * features on the rows as data, `{row, start, end, name, ...}` in
         * residues of each row, drawn with the GFF's annotations. Persists in
         * the snapshot and the URL.
         */
        features: stripDefault(types.array(types.frozen<Feature>()), []),
        /**
         * #property
         * the block the reader selected: `{start, end}` columns of the file,
         * 1-based inclusive like a column highlight, and `rows` by name, every
         * row where absent. Undefined until something is selected, so a view
         * without one adds nothing to the shared URL.
         */
        selection: types.frozen<MsaSelection | undefined>(),
        /**
         * #property
         * where the view opens, in `highlights` coordinates: `{row, start,
         * end}` zooms onto residues of that row and scrolls the row to the
         * middle, `{start, end}` zooms onto alignment columns. Applied once the
         * alignment and any tree file have loaded, then cleared, so a reloaded
         * session keeps the reader's own scroll.
         */
        region: types.frozen<Region | undefined>(),
        /**
         * #property
         * clades of the tree with a mark drawn over them. `mrca` names tips
         * whose common ancestor is the clade, or `range` its first and last
         * tip in display order, and `tips` is the leaf count the producer
         * measured. `mark` is `highlight`, `bracket`, `collapse`, `focus` or
         * `rotate`.
         * See docs/layers.md
         */
        clades: stripDefault(types.array(types.frozen<Clade>()), []),
        /**
         * #property
         * what the viewer's own marks read from `rowData`, the feature table
         * or the tree's support values: `{channel, field, scale?, legend?}`
         * per color channel, and `{channel: "featureLabel", field}` or
         * `{channel: "rowLabel", field}` for text. See docs/layers.md
         */
        encodings: stripDefault(types.array(types.frozen<Encoding>()), []),
        /**
         * #property
         * the `{field, value}` pairs the reader turned off by clicking a
         * legend row, as jbrowse-components' ADR-246 names them. A hide
         * applies wherever an ordinal or identity scale reads its field: the
         * row marks that value colors draw unpainted, and the features
         * carrying it leave the overlay, the row panels and the tracks. It
         * waits, unapplied, while no such scale reads the field. The accession
         * key's rows toggle `turnedOffFeatures` instead, which the filter
         * dialog writes. See docs/layers.md
         */
        hiddenCategories: stripDefault(
          types.array(types.frozen<HiddenCategory>()),
          [],
        ),
        /**
         * #property
         * panels drawn between the tree and the alignment:
         * `{kind: "strip", encoding: {fill}, width?, header?}` fills one cell
         * per row from a `rowData` field,
         * `{kind: "features", x, encoding?, transform?, width?, header?}`
         * draws the spans the GFF carries, `{kind: "bar" | "point",
         * encoding: {x: {field, scale?}, color?}}` draws a numeric field along
         * an axis, and `{kind: "text", encoding: {text: {field}, color?}}`
         * prints a field. See docs/layers.md
         */
        rowPanels: stripDefault(types.array(types.frozen<RowPanelSpec>()), []),
        /**
         * #property
         * the row axis's transforms over `rowData`: `filter` keeps the rows
         * passing every `{field, oneOf}` or `{field, range}` test, `sort`
         * orders the rows by `[{field, order}]` where no tree does, and
         * `facet: {field, sort?}` bands them under a label per value. See
         * docs/layers.md
         */
        rowTransform: types.frozen<RowTransform | undefined>(),
      }),
    )
    .volatile(() => ({
      /**
       * #volatile
       */
      headerHeight: 0,
      /**
       * #volatile
       * the trimmed file columns a drag holds still, see `setHeldTrimSpan`
       */
      heldTrimSpan: undefined as { start: number; end: number } | undefined,
      /**
       * #volatile
       * the height a host that fills its container measures, px. While set it
       * replaces `height`, stays out of the snapshot, and hides the drag handle
       */
      availableHeight: undefined as number | undefined,
      /**
       * #volatile
       * whether the settings panel docks beside the alignment, taking
       * `settingsPanelWidth` out of the width the view lays out in
       */
      settingsOpen: false,
      /**
       * #volatile
       * the log scale a wheel zoom has gathered against the detent at the
       * default column width and row height, per axis
       */
      zoomHeld: { col: 0, row: 0 },
      /**
       * #volatile
       * leaves the toolbar out, for a host drawing its own controls. Kept out
       * of the snapshot so a link opened in the full app shows the toolbar.
       */
      hideHeader: false,
      /**
       * #volatile
       * shows the import form while the view has no data. MSAViewer turns it
       * off, since its host supplies the data and the form is the demo app's
       */
      importForm: true,
      /**
       * #volatile
       */
      status: undefined as { msg: string; onCancel?: () => void } | undefined,
      /**
       * #volatile
       * canvas scale factor, from the device pixel ratio
       */
      highResScaleFactor:
        typeof window === 'undefined' ? 1 : window.devicePixelRatio,

      /**
       * #volatile
       * the cell size and block grid the alignment last drew at, held from a
       * wheel-zoom frame until the gesture settles. MSACanvas stretches those
       * blocks to the current cell size with one CSS transform
       */
      zoomSnapshot: undefined as ZoomSnapshot | undefined,
      /**
       * #volatile
       */
      loadingMSA: false,
      /**
       * #volatile
       */
      loadingTree: false,
      /**
       * #volatile
       */
      volatileWidth: undefined as number | undefined,
      /**
       * #volatile
       * thickness of the dividers, between the tree and the alignment and under
       * the view, px
       */
      resizeHandleWidth,

      /**
       * #volatile
       * size of blocks of content to be drawn, px
       */
      blockSize: 500,

      /**
       * #volatile
       * the currently mouse-hovered row
       */
      mouseRow: undefined as number | undefined,

      /**
       * #volatile
       * the currently mouse-hovered column
       */
      mouseCol: undefined as number | undefined,
      /**
       * #volatile
       * `key` of the highlight whose bracket the pointer is over
       */
      hoveredHighlight: undefined as string | undefined,

      /**
       * #volatile
       * the currently mouse-click row
       */
      mouseClickRow: undefined as number | undefined,

      /**
       * #volatile
       * the currently mouse-click column
       */
      mouseClickCol: undefined as number | undefined,

      /**
       * #volatile
       * the currently hovered tree node ID and its descendant leaf names
       */
      hoveredTreeNode: undefined as
        | { nodeId: string; descendantNames: string[] }
        | undefined,

      /**
       * #volatile
       * array of column indices to highlight
       */
      highlightedColumns: undefined as number[] | undefined,

      /**
       * #volatile
       * transient highlights keyed by owner, so a structure viewer's hover and
       * a genome view's hover each clear only their own. Not persisted.
       */
      transientHighlights: {} as Record<string, Highlight[]>,

      /**
       * #volatile
       */
      minimapHeight: 56,

      /**
       * #volatile
       */
      marginLeft: 20,

      /**
       * #volatile
       */
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      error: undefined as unknown,

      /**
       * #volatile
       * non-fatal load problems: an optional layer that failed to load, an
       * overlay that failed to parse. `error` replaces the view and is for the
       * alignment itself. `warnings` adds the ones derived from the data
       */
      loadWarnings: [] as string[],

      /**
       * #volatile
       * derived warnings the user dismissed, which stay hidden while the data
       * behind them holds
       */
      dismissedWarnings: [] as string[],

      /**
       * #volatile
       * bumped by reset(). The error boundary above the view uses it as its key,
       * since the boundary keeps its caught error until remounted
       */
      resetCount: 0,

      /**
       * #volatile
       * set by a host that restores the loaded documents itself, such as a
       * jbrowse session or a page that refetches them. `unshareableData` then
       * reports nothing
       */
      hostCarriesData: false,

      /**
       * #volatile
       * overlay annotations drawn on the alignment. InterProScan JSON, GFF and
       * user uploads all convert to this flat list
       */
      annotations: [] as Annotation[],
    }))
    .actions(self => ({
      /**
       * #action
       * draw the alignment with positions numbered relative to the given row's
       * sequence (its node id), instead of in raw MSA-column coordinates
       */
      drawRelativeTo(id: string | undefined) {
        self.relativeTo = id
      },
      /**
       * #action
       * hide columns that are entirely (or mostly, see allowedGappyness) gaps
       */
      setHideGaps(arg: boolean) {
        self.hideGaps = arg
      },
      /**
       * #action
       */
      setTrimToSelection(arg: boolean) {
        self.trimToSelection = arg
      },
      /**
       * #action
       */
      setAllowedGappyness(arg: number) {
        self.allowedGappyness = arg
      },
      /**
       * #action
       */
      setLoadingMSA(arg: boolean) {
        self.loadingMSA = arg
      },
      /**
       * #action
       */
      setLoadingTree(arg: boolean) {
        self.loadingTree = arg
      },
      /**
       * #action
       */
      setWidth(arg: number) {
        self.volatileWidth = arg
      },
      /**
       * #action
       */
      setSettingsOpen(arg: boolean) {
        self.settingsOpen = arg
      },
      /**
       * #action
       * update the canvas scale factor when the device pixel ratio changes
       * (moving between monitors, browser zoom)
       */
      setHighResScaleFactor(arg: number) {
        self.highResScaleFactor = arg
      },
      /**
       * #action
       * set the height of the view in px
       */
      setHeight(height: number) {
        self.height = height
      },

      /**
       * #action
       */
      setAvailableHeight(height?: number) {
        self.availableHeight = height
      },

      /**
       * #action
       * set error state
       */
      setError(error?: unknown) {
        self.error = error
      },

      /**
       * #action
       * record a non-fatal load problem: a layer that failed to load, a file
       * that failed to parse. A message already on the list is not added again
       */
      addWarning(warning: string) {
        if (!self.loadWarnings.includes(warning)) {
          self.loadWarnings = [...self.loadWarnings, warning]
        }
      },

      /**
       * #action
       * declare that this host restores the loaded documents itself, which
       * keeps `unshareableData` empty. See `hostCarriesData`
       */
      setHostCarriesData(arg: boolean) {
        self.hostCarriesData = arg
      },

      /**
       * #action
       * set mouse position (row, column) in the MSA
       *
       * Public API: a host calls this (and reads `mouseCol`) to sync hover with
       * its own view, such as a genome view or 3D structure. Keep the name and
       * signature stable.
       */
      setMousePos(col?: number, row?: number) {
        self.mouseCol = col
        self.mouseRow = row
      },
      /**
       * #action
       */
      setHoveredHighlight(key?: string) {
        self.hoveredHighlight = key
      },

      /**
       * #action
       * set highlighted columns
       *
       * Public API: jbrowse-plugin-msaview calls this from its
       * afterCreateAutoruns, and MSAViewer passes its `highlightColumns` prop
       * through it.
       */
      setHighlightedColumns(columns?: number[]) {
        self.highlightedColumns = columns
      },
      /**
       * #action
       */
      setRegion(region?: Region) {
        self.region = region
      },
      /**
       * #action
       */
      setHighlights(highlights: Highlight[]) {
        self.highlights.replace(highlights)
        self.hoveredHighlight = undefined
      },
      /**
       * #action
       */
      setFeatures(features: Feature[]) {
        self.features.replace(features)
      },
      /**
       * #action
       * select a block, in `selection` coordinates. `start` and `end` may come
       * in either order.
       */
      setSelection(selection?: MsaSelection) {
        const next = selection && {
          start: Math.min(selection.start, selection.end),
          end: Math.max(selection.start, selection.end),
          ...(selection.rows ? { rows: selection.rows } : {}),
        }
        if (!compareStructural(next, self.selection)) {
          self.selection = next
        }
        if (!next) {
          self.trimToSelection = false
        }
      },
      /**
       * #action
       * clear the selection, and the trim to it
       */
      clearSelection() {
        this.setSelection(undefined)
      },
      /**
       * #action
       * keep the trimmed columns where they are while a drag reselects inside
       * them, so the cells under the pointer stay put; undefined lets the trim
       * follow the selection again
       */
      setHeldTrimSpan(span?: { start: number; end: number }) {
        self.heldTrimSpan = span
      },

      /**
       * #action
       * replace the clades the viewer marks (see docs/layers.md)
       */
      setClades(clades: Clade[]) {
        self.clades.replace(clades)
        self.cladesSeeded = false
      },
      /**
       * #action
       * show `highlights` for `owner`, replacing that owner's previous ones and
       * leaving other owners' in place
       */
      applyHighlight(owner: string, highlights: Highlight[]) {
        self.transientHighlights = {
          ...self.transientHighlights,
          [owner]: highlights,
        }
      },
      /**
       * #action
       * remove `owner`'s highlights, leaving other owners' in place
       */
      clearHighlight(owner: string) {
        if (owner in self.transientHighlights) {
          const { [owner]: _dropped, ...rest } = self.transientHighlights
          self.transientHighlights = rest
        }
      },
      /**
       * #action
       * toggle the annotation overlay on the alignment
       */
      setShowDomains(arg: boolean) {
        self.showDomains = arg
      },
      /**
       * #action
       * hand the cell fill to the residue scheme, the domains, or neither,
       * which colors the letters instead: the `channel` and `field` of
       * `residueColor`
       */
      setCellFill(mode: 'residue' | 'domain' | 'none') {
        const { residueColor } = self
        self.setResidueColor(
          mode === 'none'
            ? { ...residueColor, channel: 'color' }
            : {
                ...residueColor,
                channel: 'fill',
                field: mode === 'domain' ? 'feature' : 'residue',
              },
        )
      },
      /**
       * #action
       * expand or collapse the domain legend that floats over the alignment
       */
      setShowDomainLegend(arg: boolean) {
        self.showDomainLegend = arg
      },
      /**
       * #action
       */
      setSubFeatureRows(arg: boolean) {
        self.subFeatureRows = arg
      },
      /**
       * #action
       * set mouse click position (row, column) in the MSA
       */
      setMouseClickPos(col?: number, row?: number) {
        self.mouseClickCol = col
        self.mouseClickRow = row
      },

      /**
       * #action
       * set row height (px)
       */
      setRowHeight(n: number) {
        self.rowHeight = n
        self.zoomHeld = { ...self.zoomHeld, row: 0 }
      },

      /**
       * #action
       * set col width (px)
       */
      setColWidth(n: number) {
        self.colWidth = n
        self.zoomHeld = { ...self.zoomHeld, col: 0 }
      },

      /**
       * #action
       * switch to another alignment of a multi-alignment file (Stockholm).
       * Clears the collapsed and rotated node ids, the subtree in focus, the
       * reference row and the scroll position, which all refer to the
       * previous alignment
       */
      setCurrentAlignment(n: number) {
        if (n === self.currentAlignment) {
          return
        }
        transaction(() => {
          self.currentAlignment = n
          this.clearNodeState()
          this.drawRelativeTo(undefined)
          self.scrollX = 0
          self.scrollY = 0
        })
      },

      /**
       * #action
       * collapse or un-collapse the subtree rooted at the given tree node id
       */
      toggleCollapsed(node: string) {
        if (self.collapsed.includes(node)) {
          self.collapsed.remove(node)
        } else {
          self.collapsed.push(node)
        }
      },

      /**
       * #action
       * reverse the order of the given node's children, or restore it
       */
      toggleRotated(node: string) {
        if (self.rotated.includes(node)) {
          self.rotated.remove(node)
        } else {
          self.rotated.push(node)
        }
      },

      /**
       * #action
       */
      clearRotated() {
        self.rotated.clear()
      },

      /**
       * #action
       * forget `collapsed`, `rotated` and `showOnly`, whose path-derived node
       * ids name other nodes once the tree changes shape, and let the clade
       * marks seed them again
       */
      clearNodeState() {
        self.collapsed.clear()
        self.rotated.clear()
        self.showOnly = undefined
        self.cladesSeeded = false
      },

      /**
       * #action
       * reroot the tree, which clears the node state (`clearNodeState`)
       */
      setTreeRoot(treeRoot?: TreeRoot) {
        if (compareStructural(self.treeRoot, treeRoot)) {
          return
        }
        transaction(() => {
          self.treeRoot = treeRoot
          this.clearNodeState()
        })
      },

      /**
       * #action
       * show only the subtree rooted at the given node id (pass undefined to
       * show the whole tree again)
       */
      setShowOnly(node?: string) {
        self.showOnly = node
      },

      /**
       * #action
       * set the alignment/tree/metadata/domain data directly from strings,
       * bypassing the filehandle loaders
       */
      setData(data: {
        msa?: string
        tree?: string
        treeMetadata?: string
        gff?: string
      }) {
        self.data = cast(data)
      },

      /**
       * #action
       */
      setMSAFilehandle(msaFilehandle?: FileLocationType) {
        self.msaFilehandle = cast(msaFilehandle)
      },

      /**
       * #action
       */
      setTreeFilehandle(treeFilehandle?: FileLocationType) {
        self.treeFilehandle = cast(treeFilehandle)
      },

      /**
       * #action
       */
      setTreeMetadataFilehandle(treeMetadataFilehandle?: FileLocationType) {
        self.treeMetadataFilehandle = cast(treeMetadataFilehandle)
      },

      /**
       * #action
       */
      setGFFFilehandle(gffFilehandle?: FileLocationType) {
        self.gffFilehandle = cast(gffFilehandle)
      },

      /**
       * #action
       * replace the alignment text and drop its filehandle, so the snapshot
       * carries the new text
       */
      setMSA(result: string) {
        self.msaFilehandle = undefined
        self.data.setMSA(result)
      },

      /**
       * #action
       * replace the tree text and drop its filehandle, as setMSA does
       */
      setTree(result: string) {
        self.treeFilehandle = undefined
        self.data.setTree(result)
      },

      /**
       * #action
       * replace the row table's JSON text and drop its filehandle, as setMSA
       * does
       */
      setTreeMetadata(result: string) {
        self.treeMetadataFilehandle = undefined
        self.data.setTreeMetadata(result)
      },

      /**
       * #action
       * store the GFF text in the snapshot like the alignment and tree. The
       * parsed annotations are volatile and a blob filehandle is cleared once
       * read, so the text is the only persisted copy. An autorun parses it
       * into annotations, and clears the ones it drew when the text goes.
       * New text drops the filehandle, as setMSA does
       */
      setGFF(result?: string) {
        if (result !== undefined) {
          self.gffFilehandle = undefined
        }
        self.data.setGFF(result)
      },
    }))

    .views(self => ({
      /**
       * #getter
       * hideGaps takes effect when a collapse or a focus hides rows, whose
       * residues leave columns all gaps among the rest, or when
       * allowedGappyness is under 100
       */
      get hideGapsEffective() {
        return (
          self.hideGaps &&
          (self.collapsed.length > 0 ||
            self.showOnly !== undefined ||
            self.allowedGappyness < 100)
        )
      },

      /**
       * #getter
       * every record that reads a field through a color object: each color
       * encoding, each strip's `fill`, each features panel's or features
       * track's `fill` naming a field, each bar, point or text panel's
       * `color`, and each other column track's `encoding.color` reading the
       * track's own values, with where it sits in the snapshot and the table
       * its field is read from
       */
      get colorRecords(): ColorRecord[] {
        return [
          ...self.encodings.flatMap((encoding, i): ColorRecord[] =>
            isColorEncoding(encoding)
              ? [
                  {
                    record: `encodings[${i}]`,
                    channel: encoding,
                    table: encodingTable(encoding),
                  },
                ]
              : [],
          ),
          ...self.rowPanels.flatMap((panel, i): ColorRecord[] => {
            const record = `rowPanels[${i}].encoding.fill`
            const fill =
              panel.kind === 'features'
                ? fieldChannel(panel.encoding?.fill)
                : undefined
            return panel.kind === 'strip'
              ? [{ record, channel: panel.encoding.fill, table: 'rows' }]
              : panel.kind === 'features'
                ? fill
                  ? [{ record, channel: fill, table: 'features' }]
                  : []
                : panel.encoding.color
                  ? [
                      {
                        record: `rowPanels[${i}].encoding.color`,
                        channel: panel.encoding.color,
                        table: 'rows',
                      },
                    ]
                  : []
          }),
          ...self.columnTracks.flatMap((track, i): ColorRecord[] => {
            const fill = fieldChannel(track.encoding?.fill)
            const color = trackColorChannel(track)
            return track.kind === 'features'
              ? fill
                ? [
                    {
                      record: `columnTracks[${i}].encoding.fill`,
                      channel: fill,
                      table: 'features',
                      annotations: trackAnnotations(track),
                    },
                  ]
                : []
              : color
                ? [
                    {
                      record: `columnTracks[${i}].encoding.color`,
                      channel: color,
                      table: 'columns',
                      values: trackColorValues(
                        track,
                        scaleKind(color.scale) === 'identity',
                      ),
                    },
                  ]
                : []
          }),
        ]
      },

      /**
       * #getter
       * the values `hiddenCategories` hides, by table and field, for the
       * fields an ordinal or identity scale in that table reads
       */
      get activeHiddenCategories() {
        return activeHiddenValues(this.colorRecords, self.hiddenCategories)
      },

      /**
       * #method
       * whether a feature carries a value the reader hid
       */
      annotationHidden(annotation: Annotation) {
        return featureHidden(
          annotation,
          this.activeHiddenCategories.get('features'),
        )
      },

      /**
       * #getter
       * whether the host restores the loaded documents outside the snapshot.
       * When true, `unshareableData` is empty.
       *
       * A simple host sets `hostCarriesData`. A host where this depends on how
       * the view was opened overrides the getter in its own composed model's
       * `.views` block; jbrowse-plugin-msaview's indexed-location views refetch
       * from a URL the session holds, while its data-store views do not.
       * `unshareableData` reads it off `self`, so an override takes effect.
       */
      get hostRestoresData() {
        return self.hostCarriesData
      },
      get viewInitialized() {
        return self.volatileWidth !== undefined
      },
      /**
       * #getter
       */
      get width() {
        if (self.volatileWidth === undefined) {
          throw new Error('not initialized')
        }
        return self.volatileWidth - (self.settingsOpen ? settingsPanelWidth : 0)
      },
    }))
    .views(self => ({
      /**
       * #getter
       * `residueColor` with its defaults filled in: the `channel`, the
       * `field`, the `scheme` name, and the `letters` table its `domain` and
       * `range` give, undefined where it lists none
       */
      get resolvedResidueColor() {
        return resolveResidueColor(self.residueColor)
      },

      /**
       * #getter
       * the color per residue letter: the `domain` and `range` of
       * `residueColor` where it lists letters, else the table its `scheme`
       * names
       */
      get colorScheme() {
        const { letters, scheme } = this.resolvedResidueColor
        // the scheme is a free string (menus, snapshots, URL params), so a
        // stale name falls back to the default
        return letters
          ? letterColorTable(letters)
          : (colorSchemes[scheme] ?? colorSchemes[defaultColorSchemeName]!)
      },

      /**
       * #getter
       * the scheme coloring each cell from its column's statistics, or
       * undefined while the cells take a fixed color per letter, from the
       * built-in table or from the `domain` and `range` of `residueColor`
       */
      get dynamicColorSchemeName() {
        const { letters, scheme } = this.resolvedResidueColor
        return !letters && scheme.includes('dynamic') ? scheme : undefined
      },

      /**
       * #getter
       */
      get header() {
        return this.MSA?.getHeader() ?? {}
      },

      /**
       * #getter
       */
      get alignmentNames() {
        return this.MSA?.alignmentNames ?? []
      },
      /**
       * #getter
       */
      get noTree() {
        return !!this.tree.noTree
      },
      get noDomains() {
        return this.allAnnotations.length === 0
      },

      /**
       * #getter
       * loaded documents left out of the snapshot, largest first. A file opened
       * from disk or pasted in becomes inline text, and DataModel drops an
       * inline document past `maxInlineSnapshotBytes`.
       *
       * The standalone app drops `#data=` from
       * the address bar while the list is non-empty or the encoded link would
       * pass its `maxLinkLength`, so a copied link never opens an empty viewer
       * unannounced. A document fetched from a URL never appears here, since
       * the snapshot keeps its filehandle.
       *
       * Empty when `hostCarriesData` is true.
       */
      get unshareableData(): UnshareableData[] {
        if (self.hostRestoresData) {
          return []
        }
        const { data } = self
        // data tracks past the limit also leave the snapshot
        const trackBytes = columnTrackSizes(self.columnTracks)
          .filter(bytes => bytes > maxInlineSnapshotBytes)
          .reduce((a, b) => a + b, 0)
        return (
          [
            ['alignment', data.msa, self.msaFilehandle],
            ['tree', data.tree, self.treeFilehandle],
            ['annotations', data.gff, self.gffFilehandle],
            ['row metadata', data.treeMetadata, self.treeMetadataFilehandle],
          ] as const
        )
          .flatMap<UnshareableData>(([what, text, filehandle]) =>
            !filehandle && text && text.length > maxInlineSnapshotBytes
              ? [{ what, bytes: text.length }]
              : [],
          )
          .concat(
            trackBytes ? [{ what: 'data tracks', bytes: trackBytes }] : [],
          )
          .toSorted((a, b) => b.bytes - a.bytes)
      },
      menuItems() {
        return []
      },
      /**
       * #getter
       * the row table: extra fields per row, keyed by row name, which the
       * `encodings` channels read. It is stored as the JSON string
       * `data.treeMetadata`, the name that travels in existing links, so the
       * inline size limit and `treeMetadataFilehandle` cover it. The tree area
       * fit reads it on every layout, so a malformed user-supplied file
       * returns {} instead of throwing out of rendering, and every field is a
       * string by the time a scale sorts it.
       */
      get rowData(): Record<string, Record<string, string> | undefined> {
        const text = self.data.treeMetadata
        if (!text) {
          return {}
        }
        try {
          const parsed: unknown = JSON.parse(text)
          return typeof parsed === 'object' && parsed !== null
            ? Object.fromEntries(
                Object.entries(parsed).map(([name, row]) => [
                  name,
                  stringFields(row),
                ]),
              )
            : {}
        } catch (e) {
          console.error('failed to parse rowData', e)
          return {}
        }
      },
      /**
       * #method
       * one row's fields, the single reader of the row table
       */
      rowDataOf(name: string) {
        return this.rowData[name]
      },
      /**
       * #getter
       * the `rowData` field drawn as each tip's label: the one a `rowLabel`
       * encoding names, else `genome`
       */
      get rowLabelField() {
        return (
          self.encodings.find(e => e.channel === 'rowLabel')?.field ?? 'genome'
        )
      },
      /**
       * #method
       * the text a row's tip label draws: its `rowLabelField` value, else the
       * row name
       */
      rowLabelOf(name: string) {
        return nonEmpty(this.rowDataOf(name)?.[this.rowLabelField]) ?? name
      },
      /**
       * #getter
       * the field names the row table carries, sorted, for a producer or a UI
       * choosing one to encode
       */
      get rowFields(): string[] {
        const fields = new Set<string>()
        for (const row of Object.values(this.rowData)) {
          for (const field of Object.keys(row ?? {})) {
            fields.add(field)
          }
        }
        return [...fields].toSorted((a, b) => a.localeCompare(b))
      },
      /**
       * #getter
       */
      get MSA() {
        const text = self.data.msa
        // uses parseMSA so the named MSAParserType return type is portable
        // to downstream consumers (avoids TS2883 with default exports)
        return text
          ? parseMSA(text, self.currentAlignment, self.msaFormat)
          : null
      },
      /**
       * #getter
       * the annotations the overlay, the legend and the encodings draw: the
       * GFF's, the `features` layer's, then the file's own per-row lines
       */
      get allAnnotations(): Annotation[] {
        const inline = this.MSA ? inlineAnnotations(this.MSA) : []
        return self.features.length > 0 || inline.length > 0
          ? [
              ...self.annotations,
              ...featuresToAnnotations(self.features),
              ...inline,
            ]
          : self.annotations
      },
      /**
       * #getter
       */
      get actuallyShowDomains() {
        return self.showDomains && this.allAnnotations.length > 0
      },
      /**
       * #getter
       */
      get numColumns() {
        return (this.MSA?.getWidth() ?? 0) - this.blanks.length
      },
      /**
       * #getter
       * `selection`'s columns clamped to the file's
       */
      get selectionFileSpan() {
        const { selection } = self
        const width = this.MSA?.getWidth() ?? 0
        const start = Math.max(1, Math.floor(selection?.start ?? 0))
        const end = Math.min(width, Math.ceil(selection?.end ?? 0))
        return selection && start <= end ? { start, end } : undefined
      },
      /**
       * #getter
       * the file columns `trimToSelection` keeps, or undefined while it keeps
       * every column
       */
      get trimSpan() {
        return self.trimToSelection
          ? (self.heldTrimSpan ?? this.selectionFileSpan)
          : undefined
      },

      /**
       * #getter
       * the tree the file or the alignment gives, before `treeRoot`
       */
      get inputTree(): NodeWithIds {
        const text = self.data.tree
        return text
          ? generateNodeIds(parseTree(text))
          : (this.MSA?.getTree() ?? {
              noTree: true,
              children: [],
              id: 'empty',
              name: 'empty',
            })
      },

      /**
       * #getter
       * the tree as the file or the alignment gives it, rerooted where
       * `treeRoot` asks. Every node id, and so `collapsed`, `rotated` and
       * `showOnly`, refers to this tree.
       */
      get tree(): NodeWithIds {
        const tree = this.inputTree
        return self.treeRoot && !tree.noTree
          ? rootTree(tree, self.treeRoot)
          : tree
      },

      /**
       * #getter
       * `tree` pruned to the tips `rowTransform.filter` keeps, the whole tree
       * where no filter is set, and undefined where the filter keeps no tip
       */
      get filteredTree(): NodeWithIds | undefined {
        const filters = self.rowTransform?.filter ?? []
        return filters.length > 0
          ? pruneTree(this.tree, name =>
              passesFilters(this.rowDataOf(name), filters),
            )
          : this.tree
      },

      /**
       * #getter
       * the tree the rows follow: `filteredTree`, with the rows of a file
       * with no tree put in `rowTransform`'s sort and facet order. A filter
       * keeping no row is left unapplied, and `dataWarnings` names it.
       */
      get arrangedTree(): NodeWithIds {
        const tree = this.filteredTree ?? this.tree
        return tree.noTree
          ? arrangeRows(tree, name => this.rowDataOf(name), self.rowTransform)
          : tree
      },

      /**
       * #getter
       * one `bracket` clade per band of `rowTransform.facet`. Under a tree a
       * band names its tips, and draws only where they are one clade of the
       * filtered tree; without one, the rows stack by band, and a band names
       * its first and last row.
       */
      get facetClades(): Clade[] {
        const facet = self.rowTransform?.facet
        const tree = this.arrangedTree
        return facet
          ? facetClades(
              tipNames(tree),
              name => this.rowDataOf(name),
              facet,
              !tree.noTree,
            )
          : []
      },

      /**
       * #getter
       * the labels of the facet bands whose rows are not one clade of the
       * filtered tree, which draw no bracket
       */
      get facetBandsNotClades(): string[] {
        return this.noTree || this.facetClades.length === 0
          ? []
          : bandsNotClades(this.facetClades, this.arrangedHierarchy)
      },

      /**
       * #getter
       * `arrangedTree` as a hierarchy, every clade expanded and none in focus,
       * which the facet bands resolve against
       */
      get arrangedHierarchy() {
        return hierarchy(this.arrangedTree, d => d.children)
      },

      /**
       * #getter
       * Returns the list of row (sequence) names in display order.
       * Part of the public API used by downstream consumers (e.g. jbrowse plugins).
       */
      get rowNames(): string[] {
        return this.leaves.map(n => n.data.name)
      },
      /**
       * #getter
       */
      get rowNamesSet() {
        return new Map(
          this.leaves.map((leaf, index) => [leaf.data.name, index] as const),
        )
      },
      /**
       * #getter
       * `clades` resolved to the rows each one covers. The tip names resolve
       * against `tree` rather than `root`, so a clade whose ancestor the user
       * collapsed keeps its rows. One leaf pass over the tree serves every
       * clade. A `range` record names no node, so `collapse`, `focus` and
       * `rotate`, which need one, drop it. The `facetClades` brackets follow,
       * resolved against `arrangedTree`.
       */
      get resolvedClades(): ResolvedClade[] {
        const facet = this.facetClades
        return self.clades.length === 0 && facet.length === 0
          ? noClades
          : [
              ...(self.clades.length > 0
                ? resolveClades(self.clades, this.treeHierarchy, this.root)
                : []),
              ...(facet.length > 0
                ? resolveClades(facet, this.arrangedHierarchy, this.root)
                : []),
            ]
      },
      /**
       * #getter
       * the pixel column reserved at the right of the tree area for the bracket
       * mark, which the tip labels and the tree itself stay clear of. Zero
       * where no clade draws a bar or a label.
       */
      get cladeGutterWidth() {
        return cladeGutterWidth([...self.clades, ...this.facetClades])
      },
      /**
       * #getter
       * whether a tree draws beside the labels: false for a file with no
       * tree, and with drawTree off
       */
      get treeDrawn() {
        return self.drawTree && !this.noTree
      },
      /**
       * #getter
       * the leaf names of the whole tree and its depth in levels. The fit
       * reads these, so a collapse or a focus leaves the tree area as it is
       */
      get treeTips() {
        return treeTips(this.tree)
      },
      /**
       * #getter
       * the whole tree as a hierarchy, every clade expanded and none in focus,
       * which the clade marks resolve against
       */
      get treeHierarchy() {
        return hierarchy(this.tree, d => d.children)
      },
      /**
       * #getter
       * the widest tip label at labelFitFontSize, measured whether or not a
       * zoom hides the labels
       */
      get maxTipLabelWidth() {
        return widestLabel(
          this.treeTips.names.map(name => this.rowLabelOf(name)),
          labelFitFontSize,
        )
      },
      /**
       * #getter
       * the px the tip labels take across the tree area: the widest label at
       * labelFitFontSize and the gaps either side of it, or 0 with drawLabels
       * off
       */
      get labelColumnWidth() {
        return self.drawLabels
          ? this.maxTipLabelWidth + (this.treeDrawn ? 10 : 6)
          : 0
      },
      /**
       * #getter
       * the tree area width while treeAreaWidth is undefined: the label column
       * beside a tree that widens with its depth, up to maxTreeAreaShare of the
       * view, or the room the row panels leave where there is no alignment.
       * Where that binds, the tree keeps minTreeWidth and the renderer
       * ellipsizes the labels
       */
      get fittedTreeAreaWidth() {
        const chrome = self.marginLeft + this.cladeGutterWidth
        const tree = this.treeDrawn
          ? (self.treeWidth ??
            clamp(
              this.treeTips.depth * pxPerTreeDepth,
              minTreeWidth,
              maxFitTreeWidth,
            ))
          : 0
        const fit = chrome + tree + this.labelColumnWidth
        const room = self.viewInitialized
          ? this.numColumns > 0
            ? self.width * maxTreeAreaShare
            : self.width - this.rowPanelsWidth - self.resizeHandleWidth
          : Infinity
        const cap = Math.max(room, chrome + Math.min(tree, minTreeWidth))
        return Math.ceil(Math.min(fit, cap))
      },
      /**
       * #getter
       * availableHeight where a host fills its container, height otherwise
       */
      get effectiveHeight() {
        return self.availableHeight ?? self.height
      },
      /**
       * #getter
       * the width of the area the tree and its labels draw in, px:
       * treeAreaWidth where set, the fit otherwise
       */
      get effectiveTreeAreaWidth() {
        return self.treeAreaWidth ?? this.fittedTreeAreaWidth
      },
      /**
       * #getter
       * the width of the tree, px: treeWidth where set, otherwise the tree
       * area less the label column, which a zoom hiding the labels gives to
       * the tree
       */
      get effectiveTreeWidth() {
        const labels = this.showTreeText ? this.labelColumnWidth : 0
        return (
          self.treeWidth ??
          Math.max(
            minTreeWidth,
            Math.floor(
              this.effectiveTreeAreaWidth -
                self.marginLeft -
                this.cladeGutterWidth -
                labels,
            ),
          )
        )
      },
      /**
       * #getter
       */
      get showTreeText() {
        return self.drawLabels && self.rowHeight >= minLetterRowHeight
      },
      /**
       * #getter
       */
      get mouseOverRowName() {
        const { mouseRow } = self
        return mouseRow === undefined
          ? undefined
          : this.leaves[mouseRow]?.data.name
      },
      /**
       * #getter
       * Returns insertion info if mouse is hovering over an insertion indicator
       */
      get hoveredInsertion() {
        const { mouseCol, mouseRow } = self
        if (mouseCol !== undefined && mouseRow !== undefined) {
          const rowName = this.leaves[mouseRow]?.data.name
          if (rowName) {
            const insertion = this.insertionPositions
              .get(rowName)
              ?.find(ins => ins.pos === mouseCol)
            if (insertion) {
              return { rowName, col: mouseCol, letters: insertion.letters }
            }
          }
        }
        return undefined
      },

      /**
       * #getter
       */
      get root() {
        return buildTreeRoot(this.arrangedTree, {
          collapsed: self.collapsed,
          rotated: self.rotated,
          order: self.treeOrder,
          showOnly: self.showOnly,
        })
      },

      /**
       * #getter
       * the tree as Newick in the order and with the root it is drawn, with
       * every clade, collapsed or out of focus
       */
      get treeNewick() {
        return writeNewick(
          buildTreeRoot(this.tree, {
            collapsed: [],
            rotated: self.rotated,
            order: self.treeOrder,
          }),
        )
      },

      /**
       * #getter
       * height of the band the tree overview draws in, zero when it is off
       */
      get treeOverviewHeight() {
        return self.showTreeOverview ? self.overviewHeight : 0
      },

      /**
       * #getter
       * the whole tree laid out for the overview, or undefined when the
       * overview is off. The focus is left out, so the focused subtree draws
       * inside the whole tree, and the collapsed clades are folded, since
       * those are rows the view no longer has. `x` is in tip-index space and
       * `len` is a fraction of the root-to-tip length, so one layout serves
       * any band size.
       */
      get treeOverviewLayout() {
        if (!self.showTreeOverview) {
          return undefined
        }
        const layout = layoutTree(
          buildTreeRoot(this.tree, {
            collapsed: self.collapsed,
            rotated: self.rotated,
            order: self.treeOrder,
          }),
          { rowHeight: 1, treeWidth: 1 },
        )
        return {
          root: layout.root,
          numTips: layout.leaves.length,
          maxDepthToLeaf: layout.root.depthToLeaf,
          showBranchLen: self.showBranchLen && layout.rootToTipLength > 0,
        }
      },

      /**
       * #getter
       * the `clades` highlights in the overview's own row space, which the
       * focus does not narrow
       */
      get treeOverviewClades(): ResolvedClade[] {
        const layout = this.treeOverviewLayout
        if (!layout || self.clades.length === 0) {
          return noClades
        }
        return resolveClades(self.clades, this.treeHierarchy, layout.root)
      },

      /**
       * #getter
       * the inclusive tip rows the focused subtree covers in the overview,
       * which is the box drawn on it. undefined with no focus
       */
      get treeOverviewFocusRows(): [number, number] | undefined {
        const layout = this.treeOverviewLayout
        if (!layout || !self.showOnly) {
          return undefined
        }
        const node = find(layout.root, n => n.data.id === self.showOnly)
        return node ? tipRange(node) : undefined
      },

      /**
       * #method
       * the subtree a point `y` pixels down the tree overview picks: the
       * deepest one whose tip range covers every row under that pixel, with
       * the rows it covers. A pixel stands for several tips on a large tree,
       * which is what keeps the pick off the individual tips. undefined when
       * the overview is off or the point picks the whole tree.
       */
      treeOverviewHit(y: number) {
        const layout = this.treeOverviewLayout
        if (!layout) {
          return undefined
        }
        const { root, numTips } = layout
        const perPixel = numTips / self.overviewHeight
        const first = clamp(Math.floor(y * perPixel), 0, numTips - 1)
        const last = clamp(
          Math.ceil((y + 1) * perPixel) - 1,
          first,
          numTips - 1,
        )
        let node = nodeCoveringRows(root, first + 0.5, last + 0.5)
        // focusing one tip leaves a single row on screen, so the pick lifts to
        // the subtree that tip sits in
        while (!node.children && node.parent) {
          node = node.parent
        }
        return node === root
          ? undefined
          : { id: node.data.id, rows: tipRange(node) }
      },

      /**
       * #getter
       * the pixel column the row panels occupy between the tree and the
       * alignment, the sum of each record's width
       */
      get rowPanelsWidth() {
        return sum(self.rowPanels.map(p => rowPanelWidth(p, self)))
      },
      /**
       * #getter
       * height of the band the row panel headers draw in, which is zero with
       * no row panels and leaves the top area as it was
       */
      get rowPanelsHeaderHeight() {
        return self.rowPanels.length > 0 ? rowPanelHeaderHeight : 0
      },
      /**
       * #getter
       * widget width minus the tree area and the row panels gives the space
       * for the MSA
       */
      get msaAreaWidth() {
        return (
          self.width -
          this.effectiveTreeAreaWidth -
          this.rowPanelsWidth -
          self.resizeHandleWidth
        )
      },

      /**
       * #getter
       * the right edge the tip labels end at, which is the tree area less the
       * margin and the bracket gutter
       */
      get treeAreaWidthMinusMargin() {
        return (
          this.effectiveTreeAreaWidth - self.marginLeft - this.cladeGutterWidth
        )
      },
      /**
       * #getter
       * the columns `hideGaps` hides, ascending
       */
      get gappyColumns() {
        const { hideGapsEffective, allowedGappyness } = self
        if (!hideGapsEffective) {
          return []
        }
        const strs = this.leaves
          .map(leaf => this.MSA?.getRow(leaf.data.name))
          .filter(notEmpty)
        if (strs.length === 0) {
          return []
        }
        // ragged input (a3m, hand-edited fasta) can have rows shorter than the
        // alignment; the widest row of the whole alignment, collapsed rows
        // included, defines the column count as it does for numColumns, and a
        // row that stops early counts as gapped for the remainder
        const numCols = this.MSA?.getWidth() ?? 0
        const numRows = strs.length
        const threshold = Math.ceil((allowedGappyness / 100) * numRows)
        const blankCounts = new Uint32Array(numCols)
        for (let j = 0; j < numRows; j++) {
          const str = strs[j]!
          const rowLength = str.length
          for (let i = 0; i < numCols; i++) {
            // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
            if (i >= rowLength || (str.charCodeAt(i) - 45) >>> 0 <= 1) {
              blankCounts[i]!++
            }
          }
        }
        const blanks = []
        for (let i = 0; i < numCols; i++) {
          if (blankCounts[i]! >= threshold) {
            blanks.push(i)
          }
        }
        return blanks
      },
      /**
       * #getter
       * the hidden columns, ascending: the gappy ones `hideGaps` hides and
       * those outside the selection `trimToSelection` hides. Every conversion
       * between file and visible columns reads this one list.
       */
      get blanks() {
        const { gappyColumns, trimSpan } = this
        return trimSpan
          ? trimBlanks(
              gappyColumns,
              trimSpan.start - 1,
              trimSpan.end,
              this.MSA?.getWidth() ?? 0,
            )
          : gappyColumns
      },
      /**
       * #getter
       * each row's residues in hidden gappy columns, as the visible column
       * they fall before and the letters. The columns a trim hides mark no
       * insertion.
       */
      get insertionPositions() {
        const { gappyColumns, rows, trimSpan } = this
        const result = new Map<string, { pos: number; letters: string }[]>()
        const from = trimSpan ? trimSpan.start - 1 : 0
        const inside = trimSpan
          ? blanksWithin(gappyColumns, from, trimSpan.end)
          : gappyColumns
        for (const [name, seq] of inside.length > 0 ? rows : []) {
          const insertions = computeRowInsertions(
            inside,
            seq.slice(from, trimSpan?.end),
          )
          if (insertions.length > 0) {
            result.set(name, insertions)
          }
        }
        return result
      },
      /**
       * #getter
       */
      get rows() {
        const MSA = this.MSA
        return this.leaves
          .map(leaf => [leaf.data.name, MSA?.getRow(leaf.data.name)] as const)
          .filter((f): f is [string, string] => !!f[1])
      },
      /**
       * #getter
       * number of rows on screen: the leaf count, which includes tree leaves
       * with no matching MSA row (drawn blank), unlike `rows.length`.
       */
      get numRows() {
        return this.leaves.length
      },

      /**
       * #method
       * index of the global column holding each ungapped sequence position of a
       * row. The domain overlay resolves thousands of these per redraw. Built
       * lazily per row and cached on the parse.
       */
      seqPosIndex(rowName: string): Int32Array | undefined {
        const MSA = this.MSA
        if (!MSA) {
          return undefined
        }
        let cache = seqPosIndexCache.get(MSA)
        if (!cache) {
          cache = new Map()
          seqPosIndexCache.set(MSA, cache)
        }
        let index = cache.get(rowName)
        if (!index) {
          const seq = MSA.getRow(rowName)
          if (!seq) {
            return undefined
          }
          index = buildSeqPosIndex(seq)
          cache.set(rowName, index)
        }
        return index
      },

      /**
       * #method
       * the row's aligned sequence by the name the tree gives it, including
       * rows a collapsed clade hides. `MSA.getRow` resolves a FASTA name whose
       * colon a Newick tool wrote as an underscore, which `rowMap` does not
       */
      rowSequence(name: string) {
        return nonEmpty(this.MSA?.getRow(name))
      },
      /**
       * #getter
       * every sequence in the alignment, keyed by the alignment's own row
       * names, including rows a collapsed clade hides
       */
      get rowMap() {
        const MSA = this.MSA
        return new Map(
          MSA?.getNames()
            .map(name => [name, MSA.getRow(name)] as const)
            .filter(([, seq]) => !!seq),
        )
      },
      /**
       * #getter
       */
      get columns() {
        const columns2d = this.columns2d
        return new Map(
          this.rows.map((row, index) => [row[0], columns2d[index]!] as const),
        )
      },
      /**
       * #getter
       */
      get columns2d() {
        const { blanks } = this
        return this.rows.map(([, str]) => skipBlanks(blanks, str).toUpperCase())
      },
      /**
       * #getter
       */
      get fontSize() {
        return fontSizeFor(self.rowHeight)
      },
      /**
       * #getter
       */
      get colStats() {
        return columnCountsFromRows(this.columns2d, this.numColumns)
      },

      /**
       * #getter
       * every letter the rows hold, hidden columns included, which a change
       * of the hidden columns leaves cached
       */
      get rowLetters() {
        return lettersInRows(this.rows.map(([, seq]) => seq))
      },

      /**
       * #getter
       * Detects sequence type based on letters present in the alignment.
       * Returns 'dna', 'rna', or 'amino'. Hidden columns count, so trimming
       * to a few columns keeps the type.
       */
      get sequenceType(): 'dna' | 'rna' | 'amino' {
        const letters =
          this.blanks.length === 0
            ? this.colStats.lettersPresent
            : this.rowLetters
        // the two-base IUPAC codes keep an ambiguous read nucleotide; the
        // three-base ones (B, D, H, V) are common amino acids, so they don't
        const ambiguous = ['N', 'R', 'Y', 'K', 'M', 'S', 'W']
        const dna = new Set(['A', 'C', 'G', 'T', ...ambiguous])
        const rna = new Set(['A', 'C', 'G', 'U', ...ambiguous])
        const isDna = letters.size > 0 && [...letters].every(l => dna.has(l))
        const isRna = letters.size > 0 && [...letters].every(l => rna.has(l))
        return isDna ? 'dna' : isRna ? 'rna' : 'amino'
      },

      /**
       * #getter
       * Pre-computed consensus letter and percent identity color per column.
       * Used by percent_identity_dynamic color scheme.
       */
      get colConsensus() {
        const { colStats } = this
        return Array.from({ length: colStats.numColumns }, (_, col) => {
          const total = colStats.total(col)
          let maxCount = 0
          let letter = ''
          colStats.forEachResidue(col, (slot, count) => {
            if (count > maxCount) {
              maxCount = count
              letter = letterOfResidueSlot(slot)
            }
          })
          const proportion = total ? maxCount / total : 0
          return {
            letter,
            color:
              proportion > 0.4
                ? `hsl(240, 30%, ${100 * Math.max(1 - proportion / 3, 0.3)}%)`
                : undefined,
          }
        })
      },

      /**
       * #getter
       * Pre-computed ClustalX colors per column.
       * Returns a map of letter -> color for each column.
       * ref http://www.jalview.org/help/html/colourSchemes/clustal.html
       */
      get colClustalX() {
        const { colStats } = this
        return Array.from({ length: colStats.numColumns }, (_, col) =>
          clustalXColumnColors(colStats, col),
        )
      },

      /**
       * #getter
       * Pre-computed similarity shades per column, for blosum62_dynamic.
       * Returns a map of letter -> color for each column. Amino acids shade by
       * BLOSUM62 similarity to the rest of the column, and an alignment of
       * nucleotides by identity, since the matrix names amino acids.
       */
      get colSimilarity() {
        const { colStats, sequenceType } = this
        const columnColors =
          sequenceType === 'amino' ? blosum62ColumnColors : identityColumnColors
        return Array.from({ length: colStats.numColumns }, (_, col) =>
          columnColors(colStats, col),
        )
      },

      /**
       * #getter
       * Conservation score per column using Shannon entropy (biojs-msa style).
       * Conservation = (1 - H/Hmax) * (1 - gapFraction)
       * Returns values 0-1 where 1 = fully conserved, 0 = no conservation.
       */
      get conservation() {
        const { colStats, alphabetMaxBits } = this
        return Array.from({ length: colStats.numColumns }, (_, col) => {
          const total = colStats.total(col)
          const gapCount = colStats.gapCount(col)
          return total > gapCount
            ? Math.max(0, 1 - colStats.entropy(col) / alphabetMaxBits) *
                (1 - gapCount / total)
            : 0
        })
      },
      /**
       * #getter
       * The information content of a fully conserved column, in bits, which
       * depends on the alphabet. Both the entropy ceiling `conservation`
       * normalizes against and the y-axis ceiling of the sequence logo track.
       */
      get alphabetMaxBits() {
        return maxBitsFor(this.sequenceType)
      },
      /**
       * #getter
       * Per-column conservation of physicochemical property class (amino acids
       * only). Surfaces conservative-substitution sites that identity-based
       * conservation misses. Empty for nucleotide alignments.
       */
      get propertyConservation() {
        return this.sequenceType === 'amino'
          ? calculatePropertyConservation(this.colStats)
          : []
      },
      /**
       * #getter
       * `root` laid out on new nodes in row and branch-length units, read in
       * pixels through `rowHeight` and `effectiveTreeWidth`. A zoom leaves it
       * and every node in it as they are, and an observer reading a node's `x`
       * or `len` observes the size it scales by.
       */
      get treeLayout() {
        const treeWidth = () => this.effectiveTreeWidth
        return layoutTree(this.root, {
          get rowHeight() {
            return self.rowHeight
          },
          get treeWidth() {
            return treeWidth()
          },
        })
      },

      /**
       * #getter
       * the laid-out tree, with pixel positions on every node
       */
      get hierarchy(): HierarchyNode {
        return this.treeLayout.root
      },

      /**
       * #getter
       */
      get totalHeight() {
        return this.leaves.length * self.rowHeight
      },

      /**
       * #getter
       */
      get leaves(): HierarchyNode[] {
        return this.treeLayout.leaves
      },

      /**
       * #getter
       * branch-length extent of the displayed tree, root to farthest tip, in
       * the tree's own units
       */
      get rootToTipLength() {
        return this.treeLayout.rootToTipLength
      },

      /**
       * #getter
       * pixels per unit of branch length in the phylogram layout, 0 in
       * cladogram mode. The tree's scale bar uses it.
       */
      get pxPerBranchLength() {
        const max = this.rootToTipLength
        return this.showBranchLenEffective && max
          ? this.effectiveTreeWidth / max
          : 0
      },

      /**
       * #getter
       * max topological depth to a tip, used to scale cladogram x-positions
       */
      get maxDepthToLeaf() {
        return this.treeLayout.root.depthToLeaf
      },

      /**
       * #getter
       */
      get allBranchesLength0() {
        return this.rootToTipLength === 0
      },

      /**
       * #getter
       * effective showBranchLen accounting for allBranchesLength0
       */
      get showBranchLenEffective() {
        return this.allBranchesLength0 ? false : self.showBranchLen
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get totalWidth() {
        return self.numColumns * self.colWidth
      },
    }))

    .views(self => ({
      /**
       * #getter
       */
      get showMsaLetters() {
        return (
          self.drawMsaLetters &&
          self.rowHeight >= minLetterRowHeight &&
          self.colWidth >= minLetterColWidth &&
          self.colWidth > self.rowHeight / 2
        )
      },
    }))
    .views(self => {
      // a spec is a frozen value, so it keys its computed until setColumnTracks
      // replaces it
      const columnTrackModels = new WeakMap<
        ColumnTrackSpec,
        IComputedValue<BasicTrack>
      >()
      return {
        /**
         * #getter
         * a data track's values, string, arcs or spans, projected from its
         * row's residues onto alignment columns when it names a row, and onto
         * the visible columns when gappy ones are hidden. A bar or strip
         * track's `raw` holds its numbers, undefined where it has none, and a
         * bar's `values` the fraction of the track's height each draws at
         * through `encoding.y.scale`
         */
        get columnTrackContent() {
          const { MSA, blanks } = self
          const width = MSA?.getWidth() ?? 0
          const project = <T>(track: ColumnTrackSpec, items: T[], fill: T) => {
            if (!track.row) {
              return items
            }
            const out = Array.from({ length: width }, () => fill)
            const index = self.seqPosIndex(track.row)
            items.forEach((item, seqPos) => {
              const col = index?.[seqPos]
              if (col !== undefined) {
                out[col] = item
              }
            })
            return out
          }
          const skip = <T>(items: T[]) => dropBlanks(blanks, items)
          // an arc endpoint maps row residue -> column -> visible column.
          // visibleColsBefore, not globalColToVisibleCol, so an endpoint in a
          // hidden column moves to the neighboring visible one and the arc stays
          const resolve = (track: ColumnTrackSpec, pos: number) => {
            const col = track.row
              ? self.seqPosIndex(track.row)?.[pos - 1]
              : pos - 1
            if (col === undefined || col < 0 || col >= width) {
              return undefined
            }
            return visibleColsBefore(blanks, col)
          }
          // a span's visible columns, its end exclusive. An end past the row
          // or the alignment clamps to its last column, and a span lying on
          // hidden columns alone draws nothing
          const spanCols = (track: ColumnTrackSpec, annotation: Annotation) => {
            const first = Math.min(annotation.start, annotation.end)
            const last = Math.max(annotation.start, annotation.end)
            const index = track.row ? self.seqPosIndex(track.row) : undefined
            const length = track.row ? (index?.length ?? 0) : width
            const startGlobal = index ? index[first - 1] : first - 1
            const endGlobal = index
              ? index[Math.min(last, length) - 1]
              : Math.min(last, length) - 1
            if (
              startGlobal === undefined ||
              endGlobal === undefined ||
              startGlobal < 0 ||
              startGlobal >= width
            ) {
              return undefined
            }
            const startCol = visibleColsBefore(blanks, startGlobal)
            const endCol = visibleColsBefore(blanks, endGlobal + 1)
            return startCol < endCol
              ? { annotation, startCol, endCol }
              : undefined
          }
          return new Map<
            string,
            {
              values?: number[]
              raw?: (number | undefined)[]
              data?: string
              arcs?: Arc[]
              spans?: ColumnSpan[]
            }
          >(
            self.columnTracks.map(track => {
              if (track.kind === 'features') {
                const unlaned = trackAnnotations(track)
                  .filter(annotation => !self.annotationHidden(annotation))
                  .map(annotation => spanCols(track, annotation))
                  .filter(notEmpty)
                const spans =
                  panelLanes(track.position, [[track.id, unlaned]]).get(
                    track.id,
                  ) ?? []
                return [track.id, { spans }] as const
              }
              if (track.kind === 'arc') {
                const arcs = (track.arcs ?? [])
                  .map(arc => {
                    const start = resolve(track, Math.min(arc.start, arc.end))
                    const end = resolve(track, Math.max(arc.start, arc.end))
                    return start !== undefined &&
                      end !== undefined &&
                      start < end
                      ? { start, end, color: arc.color, value: arc.value }
                      : undefined
                  })
                  .filter(notEmpty)
                return [track.id, { arcs }] as const
              }
              if (track.kind === 'bar' || track.kind === 'strip') {
                const raw = skip(
                  project(
                    track,
                    (track.values ?? []).map(finiteNumber),
                    undefined,
                  ),
                )
                const valueScale = barTrackScale(
                  track.encoding?.y?.scale,
                  (track.values ?? []).flatMap(v => finiteNumber(v) ?? []),
                )
                const fraction = valuePosition(valueScale, [0, 1])
                const log = valueScale.type === 'log'
                return [
                  track.id,
                  track.kind === 'bar'
                    ? {
                        raw,
                        values: raw.map(v =>
                          v === undefined || (log && v <= 0) ? 0 : fraction(v),
                        ),
                      }
                    : { raw },
                ] as const
              }
              const data = skip(
                project(track, (track.data ?? '').split(''), ' '),
              )
              return [track.id, { data: data.join('') }] as const
            }),
          )
        },
        /**
         * #method
         * the height a track draws at: what the user dragged its divider to,
         * then the height its snapshot asked for, then its kind's default. Only
         * a text track falls through to rowHeight
         */
        trackHeight(kind: TrackKind, heightKey: string = kind, given?: number) {
          return (
            self.trackHeights.get(heightKey) ??
            given ??
            defaultTrackHeights[kind] ??
            self.rowHeight
          )
        },
        /**
         * #method
         * the track a column track spec draws as, computed once per spec. A
         * text track's height falls through to rowHeight, and its own computed
         * confines the vertical zoom to it, so a sibling keeps its object and
         * its canvas skips the redraw
         */
        columnTrackModel(track: ColumnTrackSpec): BasicTrack {
          let computedModel = columnTrackModels.get(track)
          if (!computedModel) {
            computedModel = computed(() => {
              const heightKey = resizableKinds.has(track.kind)
                ? ownHeightKey(track.id)
                : undefined
              const content = this.columnTrackContent.get(track.id)
              const lanes = content?.spans?.[0]?.laneCount ?? 1
              return {
                model: {
                  id: track.id,
                  name: track.name,
                  kind: track.kind,
                  heightKey,
                  height: this.trackHeight(
                    track.kind,
                    heightKey,
                    track.height ??
                      (track.kind === 'features'
                        ? lanes * featureLaneHeight
                        : undefined),
                  ),
                  barColor: trackConstantColor(track),
                  arcColor: trackConstantColor(track),
                  data: content?.data,
                  arcs: content?.arcs,
                  spans: content?.spans,
                },
              }
            })
            columnTrackModels.set(track, computedModel)
          }
          return computedModel.get()
        },
        /**
         * #getter
         */
        get columnTrackModels(): BasicTrack[] {
          return self.columnTracks.map(track => this.columnTrackModel(track))
        },
      }
    })
    .views(self => ({
      /**
       * #getter
       */
      get secondaryStructureConsensus() {
        return self.MSA?.secondaryStructureConsensus
      },

      /**
       * #getter
       * the base pairs of the consensus secondary structure, as arcs, in
       * visible column space. The full string is parsed so hidden columns keep
       * their partners, and an end in a hidden column moves to its visible
       * neighbor, as a column track's arc does. A pair whose ends meet once
       * the columns between them are hidden draws nothing
       */
      get secondaryStructureArcs(): Arc[] | undefined {
        const { blanks } = self
        const ss = this.secondaryStructureConsensus
        if (!ss) {
          return undefined
        }
        const visible = (col: number) => visibleColsBefore(blanks, col)
        const width = self.numColumns
        return parseWuss(ss)
          .map(({ start, end, pseudoknot }) => ({
            start: visible(start),
            end: visible(end),
            color: pseudoknot ? PSEUDOKNOT_ARC : HELIX_ARC,
          }))
          .filter(arc => arc.start < arc.end && arc.end < width)
      },

      /**
       * #getter
       */
      get adapterTrackModels(): BasicTrack[] {
        const { MSA, blanks } = self
        const tracks = (MSA?.tracks ?? []).filter(t => !!t.data)
        if (tracks.length === 0) {
          // return before reading rowHeight, so zooming does not rebuild the
          // list and redraw every track canvas
          return []
        }
        const { rowHeight } = self
        return tracks.map(t => ({
          model: {
            ...t,
            kind: 'text' as const,
            data: skipBlanks(blanks, t.data!),
            height: rowHeight,
          },
        }))
      },

      /**
       * #getter
       * the consensus secondary structure as a track, when there is one. A
       * separate getter keeps the object stable across zoom, so its canvas
       * does not redraw
       */
      get basePairTrackModels(): BasicTrack[] {
        const arcs = this.secondaryStructureArcs
        return arcs?.length
          ? [
              {
                model: {
                  id: 'base-pairs',
                  name: 'Base pairs',
                  kind: 'arc' as const,
                  heightKey: 'arc',
                  height: self.trackHeight('arc'),
                  arcs,
                },
              },
            ]
          : []
      },

      /**
       * #getter
       * the tracks computed from the alignment; they depend on their heights
       * and the alphabet, not on zoom
       */
      get computedTrackModels(): BasicTrack[] {
        return [
          {
            id: 'conservation',
            name: 'Conservation',
            kind: 'bar' as const,
            barColor: 'gray',
          },
          ...(self.sequenceType === 'amino'
            ? [
                {
                  id: 'property-conservation',
                  name: 'Property conservation',
                  kind: 'bar' as const,
                  barColor: '#6a51a3',
                },
              ]
            : []),
          {
            id: 'sequence-logo',
            name: 'Sequence logo',
            kind: 'logo' as const,
          },
          // last, so it sits against the alignment it numbers
          {
            id: 'position-ruler',
            name: 'Position',
            kind: 'ruler' as const,
          },
        ].map(model => ({
          // every computed track of a kind shares that kind's height, so the
          // kind is its key
          model: {
            ...model,
            heightKey: resizableKinds.has(model.kind) ? model.kind : undefined,
            height: self.trackHeight(model.kind),
          },
        }))
      },

      /**
       * #getter
       * the reference row (`relativeTo`) repeated above the alignment, so it
       * stays in view while the rows compared against it scroll
       */
      get referenceTrackModels(): BasicTrack[] {
        const { relativeTo } = self
        const data =
          relativeTo === undefined ? undefined : self.columns.get(relativeTo)
        return relativeTo === undefined || data === undefined
          ? []
          : [
              {
                model: {
                  id: 'reference-row',
                  name: relativeTo,
                  kind: 'reference' as const,
                  data,
                  height: self.rowHeight,
                },
              },
            ]
      },

      /**
       * #method
       * a highlight label with `{residue}` and `{position}` filled in from the
       * row's letter at `start`, which is how the `175` shorthand draws "R175"
       */
      fillHighlightLabel(label: string, row?: string, start?: number) {
        if (!label.includes('{')) {
          return label
        }
        const col =
          row && start !== undefined
            ? self.seqPosIndex(row)?.[start - 1]
            : undefined
        const residue =
          row && col !== undefined ? (self.MSA?.getRow(row)[col] ?? '') : ''
        return label
          .replaceAll('{residue}', residue)
          .replaceAll('{position}', start === undefined ? '' : String(start))
      },

      /**
       * #getter
       * `highlights` projected onto what is on screen: residue spans go
       * through the named row's gap structure, column spans through the
       * hidden-column list, and a span that lands entirely on hidden columns
       * is dropped. Row names that match no row are ignored.
       */
      get resolvedHighlights(): ResolvedHighlight[] {
        const { rowNamesSet, transientHighlights } = self
        // persisted highlights first, so transient ones draw on top
        const all = [
          ...self.highlights.map(h => ({ ...h, transient: false })),
          ...Object.values(transientHighlights)
            .flat()
            .map(h => ({ ...h, transient: true })),
        ]
        return all.flatMap(
          ({ row, rows, start, end, label, color, mark, transient }) => {
            const base = {
              label: label && this.fillHighlightLabel(label, row, start),
              color,
              row,
              start,
              end,
              mark: mark ?? 'band',
              transient,
              key: JSON.stringify([row, rows, start, end, label, transient]),
            }
            if (rows) {
              const rowIndices = rows
                .map(name => rowNamesSet.get(name))
                .filter(notEmpty)
              return rowIndices.length ? [{ ...base, rowIndices }] : []
            }
            if (start === undefined || end === undefined) {
              return []
            }
            const span = this.visibleSpan({ row, start, end })
            return span ? [{ ...base, ...span, rowIndices: [] }] : []
          },
        )
      },

      get tracks(): BasicTrack[] {
        return [
          ...this.adapterTrackModels,
          ...this.basePairTrackModels,
          ...self.columnTrackModels,
          // every computed track reads the alignment's columns, and a tree, a
          // GFF and a features panel draw a figure with none
          ...(self.numColumns > 0 ? this.computedTrackModels : []),
          ...this.referenceTrackModels,
          ...this.highlightTrackModels,
        ]
      },

      /**
       * #getter
       * the column-span highlights as labeled brackets, last so they sit
       * against the alignment their bands cross
       */
      get highlightTrackModels(): BasicTrack[] {
        const bands = packHighlightBands(this.resolvedHighlights)
        return bands.length === 0
          ? []
          : [
              {
                model: {
                  id: 'highlight-brackets',
                  name: 'Highlights',
                  kind: 'highlights' as const,
                  height: highlightTrackHeight(bands),
                  bands,
                },
              },
            ]
      },

      /**
       * #getter
       */
      get turnedOnTracks() {
        return this.tracks.filter(
          f => !trackIsOff(self.turnedOffTracks, f.model.id),
        )
      },

      /**
       * #getter
       */
      get showHorizontalScrollbar() {
        return overflows(self.totalWidth, self.msaAreaWidth)
      },

      /**
       * #method
       * Return the character a row holds at a visible column: a residue, or
       * the gap character (`-` or `.`) on a gap. Undefined for a row name the
       * alignment does not have or a column past the row's end.
       *
       * @param rowName - The name of the row
       * @param visibleCol - The visible column index (what the user sees on screen)
       * @returns The character at that position
       */
      visibleColToRowLetter(rowName: string, visibleCol: number) {
        return self.rowSequence(rowName)?.[
          this.visibleColToGlobalCol(visibleCol)
        ]
      },

      /**
       * #method
       * Convert a visible column to a row-specific sequence position (0-based).
       * Returns undefined if the position is a gap in the sequence.
       *
       * Public API, like the sibling converters (visibleColToGlobalCol,
       * seqPosToVisibleCol, globalColToVisibleCol, seqPosToGlobalCol) hosts
       * use to translate between columns and residue positions. Keep them
       * stable.
       *
       * @param rowName - The name of the row
       * @param visibleCol - The visible column index
       * @returns The sequence position (0-based), or undefined if it's a gap
       */
      visibleColToSeqPos(rowName: string, visibleCol: number) {
        // binary search: this runs on every mouse move, and scanning a
        // 30k-column row per event takes the whole frame
        return seqPosOfGlobalCol(
          self.seqPosIndex(rowName),
          this.visibleColToGlobalCol(visibleCol),
        )
      },

      /**
       * #method
       * Convert a visible column to a row-specific sequence position (1-based).
       * Returns undefined if the position is a gap in the sequence.
       *
       * @param rowName - The name of the row
       * @param visibleCol - The visible column index
       * @returns The sequence position (1-based), or undefined if it's a gap
       */
      visibleColToSeqPosOneBased(rowName: string, visibleCol: number) {
        const val = this.visibleColToSeqPos(rowName, visibleCol)
        return val !== undefined ? val + 1 : undefined
      },

      /**
       * #method
       * Convert a global column index to a visible column index.
       * Returns undefined if the column is hidden (in blanks).
       * This is the inverse of visibleColToGlobalCol.
       *
       * @param globalCol - The global column index in the full MSA
       * @returns The visible column index, or undefined if the column is hidden
       */
      globalColToVisibleCol(globalCol: number) {
        return globalColToVisibleCol(self.blanks, globalCol)
      },

      /**
       * #method
       * Convert a visible column index (what a mouse handler reports) to a
       * column of the full alignment. A host indexing its own per-column data
       * needs this when columns are hidden.
       *
       * @param visibleCol - The visible column index
       * @returns The global column index in the full MSA
       */
      visibleColToGlobalCol(visibleCol: number) {
        return visibleColToGlobalCol(self.blanks, visibleCol)
      },

      /**
       * #method
       * Convert a sequence position (ungapped) to a global column index.
       * Returns undefined for a row name the alignment does not have.
       *
       * @param rowName - The name of the row
       * @param seqPos - The sequence position (0-based, ungapped)
       * @returns The global column index in the full MSA, or undefined
       */
      seqPosToGlobalCol(rowName: string, seqPos: number) {
        const seq = self.rowSequence(rowName)
        if (seq === undefined) {
          return undefined
        }
        const col = self.seqPosIndex(rowName)?.[seqPos]
        // past the end of the ungapped sequence: 0 for the degenerate all-gap
        // row, otherwise one past the last column
        return col ?? (seqPos === 0 ? 0 : seq.length)
      },

      /**
       * #method
       * the global column of a span's last residue, clamping a position past
       * the end of the row to its last residue. Undefined for a row name the
       * alignment does not have, or a row with no residues.
       *
       * @param rowName - The name of the row
       * @param seqPos - The sequence position (0-based, ungapped)
       */
      seqEndToGlobalCol(rowName: string, seqPos: number) {
        const index = self.seqPosIndex(rowName)
        return index && index.length > 0
          ? index[Math.min(seqPos, index.length - 1)]
          : undefined
      },

      /**
       * #method
       * Convert a sequence position (ungapped) directly to a visible column index.
       * This combines seqPosToGlobalCol and globalColToVisibleCol.
       *
       * @param rowName - The name of the row
       * @param seqPos - The sequence position (0-based, ungapped)
       * @returns The visible column index, or undefined if the column is hidden
       */
      seqPosToVisibleCol(rowName: string, seqPos: number) {
        const globalCol = this.seqPosToGlobalCol(rowName, seqPos)
        return globalCol === undefined
          ? undefined
          : this.globalColToVisibleCol(globalCol)
      },

      /**
       * #method
       * the visible columns a span covers, in highlight coordinates: `start`
       * and `end` are 1-based residues of `row`, or columns of the file
       * without it. A fractional position, as a zoom gesture reports one,
       * widens to the whole residue or column it falls in. A span entirely on
       * hidden columns, or naming a row the alignment lacks, gives undefined.
       */
      visibleSpan({ row, start: rawStart, end: rawEnd }: Region) {
        const { blanks } = self
        const start = Math.max(1, Math.floor(rawStart))
        const end = Math.ceil(rawEnd)
        let startGlobal = start - 1
        let endGlobal = Math.min(end, self.MSA?.getWidth() ?? end) - 1
        if (row !== undefined) {
          const rowStart = this.seqPosToGlobalCol(row, start - 1)
          const rowEnd = this.seqEndToGlobalCol(row, end - 1)
          if (rowStart === undefined || rowEnd === undefined) {
            return undefined
          }
          startGlobal = rowStart
          endGlobal = rowEnd
        }
        const startCol =
          this.globalColToVisibleCol(startGlobal) ??
          visibleColsBefore(blanks, startGlobal)
        const endCol =
          this.globalColToVisibleCol(endGlobal) ??
          visibleColsBefore(blanks, endGlobal) - 1
        return startCol <= endCol ? { startCol, endCol } : undefined
      },

      /**
       * #getter
       * why each ignored residue mapping is ignored, so a host can tell a
       * missing structure from a mapping made against a different alignment.
       */
      get residueMappingProblems(): ResidueMappingProblem[] {
        const problems: ResidueMappingProblem[] = []
        for (const mapping of self.residueMappings) {
          const where = { row: mapping.row, structureId: mapping.structure.id }
          const residues = self.seqPosIndex(mapping.row)?.length
          if (residues === undefined) {
            problems.push({
              ...where,
              scope: 'mapping',
              reason: 'no such row in the alignment',
            })
            continue
          }
          if (
            mapping.rowLength !== undefined &&
            mapping.rowLength !== residues
          ) {
            problems.push({
              ...where,
              scope: 'mapping',
              reason: `computed against a ${mapping.rowLength}-residue row; this one has ${residues}`,
            })
            continue
          }
          const overrun = mapping.segments.find(
            segment => segment.rowEnd > residues || segment.rowStart < 1,
          )
          if (overrun) {
            problems.push({
              ...where,
              scope: 'mapping',
              reason: `segment ${overrun.rowStart}-${overrun.rowEnd} does not fit a ${residues}-residue row`,
            })
            continue
          }
          for (const segment of mapping.segments) {
            if (!sameLength(segment)) {
              problems.push({
                ...where,
                scope: 'segment',
                reason: `segment ${segment.rowStart}-${segment.rowEnd} maps to ${segment.structStart}-${segment.structEnd}, which is a different length`,
              })
            }
          }
        }
        return problems
      },

      /**
       * #getter
       * the mappings that fit the loaded alignment. A row-level problem drops
       * the whole mapping; a malformed segment drops only that segment.
       */
      get usableResidueMappings(): ResidueMapping[] {
        const unusable = new Set(
          this.residueMappingProblems
            .filter(problem => problem.scope === 'mapping')
            .map(problem => `${problem.row}\u0000${problem.structureId}`),
        )
        return self.residueMappings
          .filter(m => !unusable.has(`${m.row}\u0000${m.structure.id}`))
          .map(m => ({
            ...m,
            segments: m.segments.filter(sameLength),
          }))
      },

      /**
       * #getter
       * the structures with usable mappings. A row can map onto several, such
       * as an experimental entry and a predicted model.
       */
      get mappedStructures() {
        return this.usableResidueMappings.map(m => ({
          row: m.row,
          structure: m.structure,
        }))
      },

      /**
       * #method
       * The structure residue for a row residue. Returns undefined when no
       * segment covers `seqPos`, or when the row maps onto several structures
       * and `structureId` does not pick one (see `mappedStructures`).
       *
       * Positions are 1-based, like `residueMappings` and `highlights`; the
       * column helpers above are 0-based.
       *
       * @param rowName - The alignment row
       * @param seqPos - Residue of that row, 1-based
       * @param structureId - Which structure, when the row maps onto several
       */
      structureResidue(
        rowName: string,
        seqPos: number,
        structureId?: string,
      ): StructureResidue | undefined {
        const hits: StructureResidue[] = []
        for (const mapping of this.usableResidueMappings) {
          if (mapping.row !== rowName) {
            continue
          }
          if (
            structureId !== undefined &&
            mapping.structure.id !== structureId
          ) {
            continue
          }
          const segment = mapping.segments.find(
            seg => seqPos >= seg.rowStart && seqPos <= seg.rowEnd,
          )
          if (segment) {
            const position = segment.structStart + (seqPos - segment.rowStart)
            hits.push({
              structure: mapping.structure,
              position,
              observed: !inRanges(mapping.unobserved, position),
            })
          }
        }
        return hits.length === 1 ? hits[0] : undefined
      },

      /**
       * #method
       * The row residue for a structure residue; the inverse of
       * `structureResidue`, returning undefined in the same cases. `asymId`
       * picks a chain when several mappings share an entry id, as in a
       * homodimer.
       *
       * @param structureId - The structure's id, as the mapping names it
       * @param position - Residue of that structure, 1-based label_seq_id
       * @param asymId - Which chain, when the id alone is ambiguous
       */
      rowResidue(
        structureId: string,
        position: number,
        asymId?: string,
      ): RowResidue | undefined {
        const hits: RowResidue[] = []
        for (const mapping of this.usableResidueMappings) {
          if (mapping.structure.id !== structureId) {
            continue
          }
          if (
            asymId !== undefined &&
            mapping.structure.asymId !== undefined &&
            mapping.structure.asymId !== asymId
          ) {
            continue
          }
          const segment = mapping.segments.find(
            seg => position >= seg.structStart && position <= seg.structEnd,
          )
          if (segment) {
            hits.push({
              rowName: mapping.row,
              seqPos: segment.rowStart + (position - segment.structStart),
            })
          }
        }
        return hits.length === 1 ? hits[0] : undefined
      },
    }))

    .views(self => ({
      /**
       * #getter
       * the branch-length scale bar over the tree, the guide of its branch-length
       * scale: undefined in cladogram mode, with the tree off, or when the tree
       * area is too narrow for one
       */
      get treeScaleBar() {
        return scaleBarLength(
          self.pxPerBranchLength,
          self.effectiveTreeAreaWidth - self.marginLeft * 2,
        )
      },
      /**
       * #getter
       * the band across the top: the minimap over the alignment, the row panel
       * headers, and the tree overview stacked on the scale bar, as tall as the
       * tallest of the three
       */
      get topBandHeight() {
        return Math.max(
          self.showHorizontalScrollbar ? self.minimapHeight : 0,
          self.rowPanelsHeaderHeight,
          self.treeOverviewHeight +
            (this.treeScaleBar ? treeScaleBarHeight : 0),
        )
      },
      /**
       * #getter
       * the vertical space for alignment rows: the widget height less the
       * header, the top band and the tracks. Shared by blocksY, maxScrollY, the
       * vertical scrollbar and fitVertically.
       */
      get msaAreaHeight() {
        return (
          self.effectiveHeight -
          this.topBandHeight -
          self.headerHeight -
          this.totalTrackAreaHeight
        )
      },
      /**
       * #getter
       * total height of track area (px)
       */
      get totalTrackAreaHeight() {
        return sum(self.turnedOnTracks.map(r => r.model.height))
      },
      /**
       * one representative annotation per accession, for the legend, the
       * filter dialog and the palettes
       */
      get annotationTypes() {
        // first occurrence wins; only name, description and segment start are
        // read from it
        const byAccession = new Map<string, Annotation>()
        for (const annot of self.allAnnotations) {
          if (!byAccession.has(annot.accession)) {
            byAccession.set(annot.accession, annot)
          }
        }
        return byAccession
      },
      /**
       * accessions hidden until the user turns them on, such as a Stockholm
       * file's #=GR lines
       */
      get defaultOffAccessions() {
        return new Set(
          self.allAnnotations.filter(a => a.defaultOff).map(a => a.accession),
        )
      },
      /**
       * #method
       */
      featureOff(accession: string) {
        return (
          self.turnedOffFeatures.get(accession) ??
          this.defaultOffAccessions.has(accession)
        )
      },
      /**
       * #getter
       * the annotations the filter dialog leaves on
       */
      get typeFilteredAnnotations() {
        return self.allAnnotations.filter(r => !this.featureOff(r.accession))
      },
      /**
       * #getter
       * the annotations drawn: those the filter dialog leaves on, less those
       * carrying a value a legend click hid
       */
      get filteredAnnotations() {
        const shown = this.typeFilteredAnnotations
        return self.activeHiddenCategories.has('features')
          ? shown.filter(r => !self.annotationHidden(r))
          : shown
      },
      /**
       * #getter
       * what colors the alignment's cells: the residue scheme, the domains
       * covering them, or nothing, which leaves the scheme to the letters.
       * Domains own the fill only while some are drawn, so a file whose
       * annotations all start hidden keeps its residue colors
       */
      get cellFill(): 'residue' | 'domain' | 'none' {
        const { channel, field } = self.resolvedResidueColor
        return channel === 'color'
          ? 'none'
          : self.actuallyShowDomains &&
              field === 'feature' &&
              this.filteredAnnotations.length > 0
            ? 'domain'
            : 'residue'
      },
      get annotationsByRow() {
        const { rowNamesSet } = self
        return groupBy(this.filteredAnnotations, r =>
          annotationRowName(r.id, rowNamesSet),
        )
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get showVerticalScrollbar() {
        return overflows(self.totalHeight, self.msaAreaHeight)
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get dataInitialized() {
        // truthiness, not `!== ''`: DataModel drops an inline document over
        // 50kb from the snapshot, so a restored session can hold `undefined`
        return (!!self.data.msa || !!self.data.tree) && !self.error
      },
      /**
       * #getter
       */
      get blocksX() {
        return calculateBlocks({
          viewportSize: self.msaAreaWidth,
          viewportPos: -self.scrollX,
          blockSize: self.blockSize,
          mapSize: self.totalWidth,
        })
      },
      /**
       * #getter
       */
      get blocksY() {
        return calculateBlocks({
          viewportSize: self.msaAreaHeight,
          viewportPos: -self.scrollY,
          blockSize: self.blockSize,
          mapSize: self.totalHeight,
        })
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get verticalScrollbarWidth() {
        return self.showVerticalScrollbar ? 20 : 0
      },
      /**
       * #getter
       * width of the alignment canvas: the msa area less the vertical
       * scrollbar. showHorizontalScrollbar must not read it, since that feeds
       * msaAreaHeight -> showVerticalScrollbar and would form a cycle
       */
      get msaCanvasWidth() {
        return self.msaAreaWidth - this.verticalScrollbarWidth
      },
      /**
       * #getter
       * most-negative allowed scrollX, which keeps the last column in view
       */
      get maxScrollX() {
        return Math.min(-self.totalWidth + this.msaCanvasWidth, 0)
      },
      /**
       * #getter
       */
      get blocks2d() {
        return self.blocksY.flatMap(by =>
          self.blocksX.map(bx => [bx, by] as const),
        )
      },
      /**
       * #getter
       */
      get wheelZooming() {
        return self.zoomSnapshot !== undefined
      },

      /**
       * #getter
       */
      get isLoading() {
        return self.loadingMSA || self.loadingTree
      },
      /**
       * #getter
       * warnings that follow from the loaded data and clear when it changes. A
       * GFF whose first column names rows of some other alignment parses
       * without error and draws nothing
       */
      get dataWarnings(): string[] {
        const { annotations, dataInitialized } = self
        const tips =
          dataInitialized && annotations.length > 0
            ? new Set(self.treeTips.names)
            : undefined
        return [
          ...(tips &&
          !annotations.some(a => tips.has(annotationRowName(a.id, tips)))
            ? [
                `0 of ${annotations.length} annotations name a row in this alignment`,
              ]
            : []),
          ...(dataInitialized ? this.rowTransformWarnings : []),
        ]
      },
      /**
       * #getter
       * what `rowTransform` asks for and the view does not draw: a filter
       * keeping no row, a sort under a tree, and facet bands that are not
       * clades of the tree
       */
      get rowTransformWarnings(): string[] {
        const transform = self.rowTransform
        const notClades = self.facetBandsNotClades
        return [
          ...(transform?.filter?.length && !self.filteredTree
            ? [
                `rowTransform.filter keeps none of the ${self.treeTips.names.length} rows, so every row is shown`,
              ]
            : []),
          ...(transform?.sort?.length && !self.noTree
            ? [
                'The tree sets the row order, so rowTransform.sort is not applied',
              ]
            : []),
          ...(notClades.length > 0
            ? [
                `${notClades.length} of ${self.facetClades.length} facet bands are not clades of the tree and draw no label: ${notClades.slice(0, 5).join(', ')}${notClades.length > 5 ? ', …' : ''}`,
              ]
            : []),
        ]
      },
      /**
       * #getter
       * the load warnings and the undismissed data warnings, for the header
       */
      get warnings(): string[] {
        return [
          ...self.loadWarnings,
          ...this.dataWarnings.filter(w => !self.dismissedWarnings.includes(w)),
        ]
      },
      /**
       * #getter
       * most-negative allowed scrollY, which keeps the last row in view
       */
      get maxScrollY() {
        return Math.min(-self.totalHeight + self.msaAreaHeight, 0)
      },
      /**
       * #getter
       * axis a wheel zoom scales, for ctrl+wheel as much as for scroll-zoom.
       * With scroll-zoom off the toolbar shows no axis, so ctrl+wheel takes
       * both.
       */
      get wheelZoomAxis(): ScrollZoomAxis {
        return self.scrollZoom ? self.scrollZoomAxis : 'both'
      },
    }))
    .actions(self => ({
      /**
       * #action
       */
      setDrawMsaLetters(arg: boolean) {
        self.drawMsaLetters = arg
      },

      /**
       * #action
       */
      clearWarnings() {
        self.loadWarnings = []
        self.dismissedWarnings = self.dataWarnings
      },

      /**
       * #action
       */
      setScrollZoom(arg: boolean) {
        self.scrollZoom = arg
      },

      /**
       * #action
       */
      setScrollZoomAxis(arg: ScrollZoomAxis) {
        self.scrollZoomAxis = arg
      },

      /**
       * #action
       * set hovered tree node and its descendants
       */
      setHoveredTreeNode(nodeId?: string) {
        // called on every tree mousemove; `find` walks the whole hierarchy and a
        // new object redraws the tree and MSA overlays
        if (nodeId === self.hoveredTreeNode?.nodeId) {
          return
        }
        if (!nodeId) {
          self.hoveredTreeNode = undefined
          return
        }
        const node = find(self.hierarchy, n => n.data.id === nodeId)
        self.hoveredTreeNode = node
          ? {
              nodeId,
              descendantNames: leaves(node).map(leaf => leaf.data.name),
            }
          : undefined
      },

      /**
       * #action
       * Calculate a neighbor joining tree from the current MSA using BLOSUM62
       * distances. Throws above `maxNeighborJoiningRows`: the join loop is
       * cubic and runs on the main thread, and 800 rows freeze the tab for ten
       * seconds with no cancel.
       */
      calculateNeighborJoiningTreeFromMSA() {
        // every sequence, including rows in collapsed clades
        const rows = [...self.rowMap]
        if (rows.length < 2) {
          throw new Error('Need at least 2 sequences to build a tree')
        }
        if (rows.length > maxNeighborJoiningRows) {
          throw new Error(
            `Neighbor joining here is capped at ${maxNeighborJoiningRows} sequences and this alignment has ${rows.length}. Build the tree with FastTree or IQ-TREE and open it alongside the alignment: https://gmod.org/JBrowseMSA/tutorials/protein_family`,
          )
        }
        this.replaceTree(calculateNeighborJoiningTree(rows))
      },

      /**
       * #action
       * root the tree on the branch above the given node. The node's tips are
       * a split of the unrooted tree, and the side of it that is a clade in
       * the tree as written stands for it as an outgroup, by its first and
       * last tip, so the root survives the path ids changing under it
       */
      rerootAt(nodeId: string) {
        const shown = find(self.treeHierarchy, n => n.data.id === nodeId)
        if (!shown?.parent) {
          return
        }
        const node = outgroupNode(
          hierarchy(self.inputTree, d => d.children),
          leaves(shown).map(n => n.data.name),
        )
        if (node) {
          const tips = leaves(node)
          self.setTreeRoot({
            outgroup: [
              ...new Set([tips[0]!.data.name, tips.at(-1)!.data.name]),
            ],
          })
        }
      },

      /**
       * #action
       * apply the `collapse`, `focus` and `rotate` clade marks to the node
       * state. A mark that resolves to no node, as against the flat stub
       * before a tree loads, leaves the marks to seed again
       */
      seedCladeMarks() {
        const { resolvedClades } = self
        self.cladesSeeded = resolvedClades.some(c => seedingMarks.has(c.mark))
        for (const { mark, nodeId } of resolvedClades) {
          if (nodeId !== undefined) {
            if (mark === 'collapse' && !self.collapsed.includes(nodeId)) {
              self.collapsed.push(nodeId)
            } else if (mark === 'focus') {
              self.showOnly = nodeId
            } else if (mark === 'rotate' && !self.rotated.includes(nodeId)) {
              self.rotated.push(nodeId)
            }
          }
        }
      },

      /**
       * #action
       * swap in a different tree over the same alignment, clearing the node
       * state (`clearNodeState`) and the tree's filehandle
       */
      replaceTree(newick: string) {
        transaction(() => {
          self.clearNodeState()
          self.setTree(newick)
        })
      },

      /**
       * #action
       * restore the default column width and row height
       */
      resetZoom() {
        self.setColWidth(defaultColWidth)
        self.setRowHeight(defaultRowHeight)
      },
      /**
       * #action
       * zoom by `scaleFactor` about the center of the alignment area
       */
      zoomAtCenter(scaleFactor: number, axis: ScrollZoomAxis = 'both') {
        this.zoomToPos(
          scaleFactor,
          self.msaCanvasWidth / 2,
          self.msaAreaHeight / 2,
          axis,
        )
      },
      /**
       * #action
       */
      zoomIn() {
        this.zoomAtCenter(1.5)
      },
      /**
       * #action
       */
      zoomOut() {
        this.zoomAtCenter(0.75)
      },
      /**
       * #action
       * Smoothly zoom by a continuous scaleFactor. The column under the cursor
       * (offsetX/offsetY, px relative to the MSA area) stays anchored
       * horizontally. Vertically the anchor is biased toward y=0 when the
       * alignment nearly fits the viewport, fading to cursor-anchoring as the
       * alignment grows taller than the viewport.
       * Drives wheel/trackpad-pinch zoom. `axis` holds one cell dimension
       * fixed; the held axis still re-anchors its scroll offset, since the
       * other one can change how much of the alignment fits.
       */
      zoomToPos(
        scaleFactor: number,
        offsetX: number,
        offsetY: number,
        axis: ScrollZoomAxis = 'both',
      ) {
        transaction(() => {
          const colInView = (-self.scrollX + offsetX) / self.colWidth
          const rowInView = (-self.scrollY + offsetY) / self.rowHeight
          // zooming both axes, an axis holds at the default only while the
          // other sits there too, or one would hold while the other grows
          const canHold =
            axis !== 'both' ||
            (self.colWidth === defaultColWidth &&
              self.rowHeight === defaultRowHeight)
          if (axis !== 'vertical') {
            const { value, held } = detentZoom(
              self.colWidth,
              scaleFactor,
              defaultColWidth,
              self.zoomHeld.col,
              minColWidth,
              canHold,
            )
            self.colWidth = value
            self.zoomHeld = { ...self.zoomHeld, col: held }
          }
          if (axis !== 'horizontal') {
            const { value, held } = detentZoom(
              self.rowHeight,
              scaleFactor,
              defaultRowHeight,
              self.zoomHeld.row,
              minRowHeight,
              canHold,
            )
            self.rowHeight = value
            self.zoomHeld = { ...self.zoomHeld, row: held }
          }
          self.scrollX = clamp(
            offsetX - colInView * self.colWidth,
            self.maxScrollX,
            0,
          )

          const anchoredScrollY = offsetY - rowInView * self.rowHeight
          // -maxScrollY is the overflow past the viewport, 0 when it fits
          const overflow = Math.max(0, -self.maxScrollY)
          const visibleHeight = self.totalHeight - overflow
          const topBias =
            visibleHeight > 0 ? clamp(1 - overflow / visibleHeight, 0, 1) : 1
          self.scrollY = clamp(
            anchoredScrollY * (1 - topBias),
            self.maxScrollY,
            0,
          )
        })
      },
      /**
       * #action
       * zoomToPos for one wheel or pinch frame. The alignment keeps the blocks
       * it drew at the start of the gesture, scaled, and redraws them only once
       * they stop covering the viewport; endWheelZoom redraws them sharp
       */
      wheelZoomToPos(scaleFactor: number, offsetX: number, offsetY: number) {
        self.zoomSnapshot ??= takeZoomSnapshot(self, false)
        this.zoomToPos(scaleFactor, offsetX, offsetY, self.wheelZoomAxis)
        if (!zoomSnapshotCovers(self, self.zoomSnapshot)) {
          self.zoomSnapshot = takeZoomSnapshot(self, true)
        }
      },
      /**
       * #action
       */
      endWheelZoom() {
        self.zoomSnapshot = undefined
      },
      /**
       * #action
       */
      doScrollY(deltaY: number) {
        this.setScrollY(self.scrollY + deltaY)
      },

      /**
       * #action
       * set scroll Y-offset (px), clamped to keep the alignment in view
       */
      setScrollY(n: number) {
        self.scrollY = clamp(n, self.maxScrollY, 0)
      },

      /**
       * #action
       * Set the overlay annotations (an empty list clears them). InterProScan,
       * GFF, user uploads and NCBI CDD all arrive here as Annotation[].
       *
       * Leaves `showDomains` alone, because a restored snapshot reloads its
       * GFF and must keep a hidden overlay hidden.
       */
      setAnnotations(annotations: Annotation[]) {
        self.annotations = annotations
      },

      /**
       * #action
       * parse GFF3, or an InterProScan JSON response, into the annotations
       */
      applyGFFText(gffText: string) {
        this.setAnnotations(
          gffToAnnotations(parseGFF(annotationTextToGFF(gffText))),
        )
      },

      /**
       * #action
       */
      doScrollX(deltaX: number) {
        this.setScrollX(self.scrollX + deltaX)
      },

      /**
       * #action
       */
      setScrollX(n: number) {
        self.scrollX = clamp(n, self.maxScrollX, 0)
      },

      /**
       * #action
       */
      setColumnTracks(tracks: ColumnTrackSpec[]) {
        self.columnTracks.replace(tracks)
      },
      /**
       * #action
       * replace the row table, which the model keeps as the JSON string
       * `data.treeMetadata` (see docs/layers.md)
       */
      setRowData(rowData: RowDataInput) {
        self.setTreeMetadata(JSON.stringify(rowData))
      },
      /**
       * #action
       * replace what the viewer's marks read from the row table
       */
      setEncodings(encodings: Encoding[]) {
        self.encodings.replace(encodings)
      },
      /**
       * #action
       * replace the panels drawn between the tree and the alignment
       */
      setRowPanels(panels: RowPanelSpec[]) {
        self.rowPanels.replace(panels)
      },
      /**
       * #action
       * replace the row axis's filter, sort and facet
       */
      setRowTransform(transform?: RowTransform) {
        self.rowTransform = transform
      },
      /**
       * #action
       * replace the alignment<->structure correspondence (see docs/layers.md)
       */
      setResidueMappings(mappings: ResidueMapping[]) {
        self.residueMappings.replace(mappings)
      },
      /**
       * #action
       */
      toggleTrack(id: string) {
        this.setTracksShown([id], trackIsOff(self.turnedOffTracks, id))
      },
      /**
       * #action
       * show or hide several tracks at once, as the track selector's Show all
       * and Hide all do. A choice matching the track's default is dropped, so
       * it stays out of the shared URL
       */
      setTracksShown(ids: string[], shown: boolean) {
        for (const id of ids) {
          if (defaultOffTracks.has(id) === !shown) {
            self.turnedOffTracks.delete(id)
          } else {
            self.turnedOffTracks.set(id, !shown)
          }
        }
      },
      /**
       * #action
       */
      setStatus(status?: { msg: string; onCancel?: () => void }) {
        self.status = status
      },
    }))
    .views(self => ({
      /**
       * #method
       * the cell at a visible column and row index, in the coordinates a host
       * writes highlights in. On a gap `residue` is undefined and `letter` is
       * the gap character
       */
      cellAt(visibleCol: number, rowIndex?: number): Cell {
        const column = self.visibleColToGlobalCol(visibleCol)
        const row =
          rowIndex === undefined ? undefined : self.leaves[rowIndex]?.data.name
        return row === undefined
          ? { column: column + 1 }
          : {
              column: column + 1,
              row,
              residue: self.visibleColToSeqPosOneBased(row, visibleCol),
              letter: self.rowSequence(row)?.[column],
            }
      },
      /**
       * #getter
       * the cell under the pointer. Public API: MSAViewer's onCellHover
       * reports it.
       */
      get hoveredCell() {
        const { mouseCol, mouseRow } = self
        return mouseCol === undefined
          ? undefined
          : this.cellAt(mouseCol, mouseRow)
      },
      /**
       * #getter
       * the cell a click pinned. Public API: MSAViewer's onCellClick reports it.
       */
      get clickedCell() {
        const { mouseClickCol, mouseClickRow } = self
        return mouseClickCol === undefined
          ? undefined
          : this.cellAt(mouseClickCol, mouseClickRow)
      },
      /**
       * #getter
       * the columns on screen. Public API: MSAViewer's onViewportChange reports
       * it.
       */
      get viewport(): Viewport | undefined {
        const { scrollX, colWidth, numColumns, viewInitialized } = self
        if (numColumns === 0 || !viewInitialized) {
          return undefined
        }
        const { xStart, xEnd } = visibleColRange({
          offsetX: -scrollX,
          blockWidth: self.msaCanvasWidth,
          colWidth,
        })
        const last = Math.max(0, Math.min(xEnd, numColumns) - 1)
        return {
          startColumn: self.visibleColToGlobalCol(Math.min(xStart, last)) + 1,
          endColumn: self.visibleColToGlobalCol(last) + 1,
        }
      },
      /**
       * #getter
       * ordinal segment types (exons etc.), ordered by sequence position so
       * exon-1..exon-14 run left-to-right; colored by alternating shade and
       * labeled by number, with no legend row
       */
      get segmentDomainTypes() {
        return [...self.annotationTypes.values()]
          .filter(d => segmentFeatureTypes.has(d.featureType ?? ''))
          .toSorted((a, b) => a.start - b.start)
      },

      /**
       * #getter
       * the legend items of the accession palette, for the overlay and a
       * features panel that names no color scale
       */
      get domainLegendItems(): LegendItem[] {
        return this.categoricalDomainTypes
          .filter(
            d =>
              !self.featureOff(d.accession) ||
              self.turnedOffFeatures.get(d.accession) === true,
          )
          .toSorted((a, b) => a.start - b.start)
          .map(d => ({
            value: d.accession,
            label: d.name,
            color: d.color ?? this.fillPalette[d.accession]!,
            ...(self.featureOff(d.accession) ? { hidden: true } : {}),
          }))
      },
      /**
       * #getter
       * categorical feature types (InterPro domains and the like) that each get
       * their own color and a legend entry
       */
      get categoricalDomainTypes() {
        return [...self.annotationTypes.values()].filter(
          d => !segmentFeatureTypes.has(d.featureType ?? ''),
        )
      },
      /**
       * #getter
       * accession -> fill: segments alternate two shades, a domain takes a
       * mid-light color and a site a dark one, so a site's residues stand out on
       * the domain around them
       */
      get fillPalette() {
        const segments = Object.fromEntries(
          this.segmentDomainTypes.map((d, i) => [
            d.accession,
            segmentShades[i % segmentShades.length]!,
          ]),
        )
        const accessions = (site: boolean) =>
          this.categoricalDomainTypes
            .filter(d => isSiteType(d.featureType) === site)
            .map(d => d.accession)
        return {
          ...segments,
          ...createPaletteMap(accessions(false), domainFills, 75),
          ...createPaletteMap(accessions(true), siteFills, 40),
        }
      },
      /**
       * #getter
       * the encoding coloring the overlay's spans, undefined when none does,
       * which leaves each span the color its accession takes in `fillPalette`
       */
      get featureFillEncoding() {
        return this.encodingFor('featureFill')
      },

      /**
       * #getter
       * the fill and outline of every feature's span: its own GFF `color=`
       * first, then the `featureFill` scale, then the accession palette.
       * Computed once per change of the features, the encodings or the palette
       */
      get featureColors(): Map<Annotation, { fill: string; stroke: string }> {
        return featureColorMap(
          self.filteredAnnotations,
          this.featureFillEncoding,
          annotation => this.fillPalette[annotation.accession]!,
        )
      },

      /**
       * #getter
       * the text the `featureLabel` channel draws inside each span, undefined
       * when no encoding names the channel. A data channel, so it draws
       * whether or not the residue letters do
       */
      get featureLabels(): Map<Annotation, string> | undefined {
        const encoding = self.encodings.find(e => e.channel === 'featureLabel')
        return encoding
          ? featureLabelMap(self.filteredAnnotations, encoding.field)
          : undefined
      },

      /**
       * #getter
       * accession -> number drawn on each segment band: the trailing number of
       * the feature name ("exon-3" -> "3"), else its 1-based position
       */
      get segmentLabels() {
        return new Map(
          this.segmentDomainTypes.map((d, i) => {
            const m = /(\d+)\s*$/.exec(d.name)
            return [d.accession, m ? m[1]! : `${i + 1}`]
          }),
        )
      },

      /**
       * #getter
       * the domain types currently drawn on the alignment (filtered-on), shared
       * by the on-screen legend and the SVG export legend: the categorical types
       * ordered by sequence position. Ordinal segments (exons) are numbered on
       * the band instead
       */
      get visibleDomainTypes() {
        return this.categoricalDomainTypes
          .filter(d => !self.featureOff(d.accession))
          .toSorted((a, b) => a.start - b.start)
      },

      /**
       * #getter
       * the color keys drawn for this view, one section per scale, shared by
       * the on-screen legend overlay and the SVG export's reserved column. The
       * domain overlay produces the first, listing the `featureFill` scale
       * where an encoding names one. Every scale a row-table encoding, a row
       * panel or a shown column track reads produces one more, keyed by its
       * declaration, so two
       * channels or two strips declaring one scale list it once, and strips
       * over eight fields naming one `legend.title` list one legend between
       * them. A section's note is the first of its records' `scaleProblems`,
       * else the scale's own note.
       */
      get legends(): LegendSection[] {
        const { featureFillEncoding, scaleProblemNotes, categoryFields } = this
        const { hiddenCategories } = self
        const byKey = new Map<string, LegendSection>()
        const ids = new Set<string>()
        // the accession palette keys on no field, so it takes a key of its own
        const add = (
          key: string | undefined,
          title: string | undefined,
          items: LegendItem[],
          note?: string,
          overlay = false,
        ) => {
          const k = key ?? 'domains'
          if (items.length > 0 && !byKey.has(k)) {
            const base =
              overlay || key === undefined ? 'domains' : `rowData-${title}`
            let id = base
            for (let n = 2; ids.has(id); n++) {
              id = `${base}-${n}`
            }
            ids.add(id)
            const problem =
              key === undefined ? undefined : scaleProblemNotes.get(key)
            const fields =
              key === undefined ? undefined : categoryFields.get(key)
            const hides: LegendHides | undefined =
              key === undefined
                ? { kind: 'featureType' }
                : fields
                  ? { kind: 'category', fields }
                  : undefined
            byKey.set(k, {
              id,
              title: title ?? 'Domains',
              ...((problem ?? note) ? { note: problem ?? note } : {}),
              items: fields
                ? items.map(item =>
                    item.value &&
                    categoryHiddenIn(hiddenCategories, fields, item.value)
                      ? { ...item, hidden: true }
                      : item,
                  )
                : items,
              ...(hides ? { hides } : {}),
            })
          }
        }
        // the overlay draws the domain key; with no columns it draws nothing,
        // and a features panel taking the same colors lists them instead
        if (self.actuallyShowDomains && self.numColumns > 0) {
          add(
            featureFillEncoding?.key,
            featureFillEncoding?.title,
            featureFillEncoding
              ? featureFillEncoding.items
              : this.domainLegendItems,
            featureFillEncoding?.note,
            true,
          )
        }
        for (const encoding of this.resolvedEncodings) {
          if (encoding.channel !== 'featureFill') {
            add(encoding.key, encoding.title, encoding.items, encoding.note)
          }
        }
        for (const panel of this.rowPanelScales) {
          add(
            panel.legendKey,
            panel.legendTitle,
            panel.legend,
            panel.legendNote,
          )
        }
        for (const [id, { scale }] of [
          ...this.featureTrackScales,
          ...this.columnTrackColors,
        ]) {
          if (scale && !trackIsOff(self.turnedOffTracks, id)) {
            add(scale.key, scale.title, scale.items, scale.note)
          }
        }
        return [...byKey.values()]
      },

      /**
       * #getter
       * the fields each ordinal or identity scale reads, keyed by
       * declaration as `resolvedScales` is: a click on a row of its legend
       * hides that value in every one of them
       */
      get categoryFields() {
        const fields = new Map<string, string[]>()
        for (const { channel, table } of self.colorRecords) {
          if (isCategorical(this.scaleOf(channel, table).kind)) {
            const key = declarationKey({
              spec: channel,
              field: channel.field,
              table,
            })
            const list = fields.get(key) ?? []
            if (!list.includes(channel.field)) {
              fields.set(key, [...list, channel.field])
            }
          }
        }
        return fields
      },

      /**
       * #getter
       * why a record's color object draws other than it says, per record: a
       * `domainMax` below its `domainMin`, a threshold whose cuts are unsorted
       * or whose `range` is not one longer, a `domainQuantile` outside 0.5 to
       * 1, `labels` of the wrong length, a `scheme` no table holds. A bar or
       * point panel's value scale lists its ends' problems under
       * `rowPanels[i].encoding.x`, and a bar track's under
       * `columnTracks[i].encoding.y`. The viewer draws what it can, and the
       * scale's legend notes the first problem.
       */
      get scaleProblems(): RecordScaleProblem[] {
        return [
          ...this.colorRecordProblems.flatMap(({ record, problems }) =>
            problems.map(problem => ({ record, ...problem })),
          ),
          ...self.rowPanels.flatMap((panel, i) =>
            panel.kind === 'bar' || panel.kind === 'point'
              ? valueScaleProblems(panel.encoding.x).map(problem => ({
                  record: `rowPanels[${i}].encoding.x`,
                  ...problem,
                }))
              : [],
          ),
          ...self.columnTracks.flatMap((track, i) =>
            track.kind === 'bar' && track.encoding?.y
              ? valueScaleProblems(track.encoding.y).map(problem => ({
                  record: `columnTracks[${i}].encoding.y`,
                  ...problem,
                }))
              : [],
          ),
        ]
      },

      /**
       * #getter
       * the first problem of each declaration's records, keyed as
       * `resolvedScales` is, for its legend section's note
       */
      get scaleProblemNotes() {
        const notes = new Map<string, string>()
        for (const { key, problems } of this.colorRecordProblems) {
          const [first] = problems
          if (first && !notes.has(key)) {
            notes.set(key, first.message)
          }
        }
        return notes
      },

      /**
       * #getter
       * each color record with its declaration key and the problems its color
       * object has, checked once for `scaleProblems` and the legend notes both
       */
      get colorRecordProblems() {
        return self.colorRecords.map(({ record, channel, table }) => ({
          record,
          key: declarationKey({ spec: channel, field: channel.field, table }),
          problems: colorProblems(channel),
        }))
      },

      /**
       * #getter
       * whether the overlay marks each domain with a bar under its row instead
       * of filling the row behind the letters: whenever the domains do not own
       * the cell fill (`cellFill`), a filled box would paint over the residue
       * colors the user picked. Sub-row layout already stacks
       * the boxes clear of the letters, and with the letters too small to draw
       * the filled box is the only thing left to read.
       */
      get domainUnderline() {
        return (
          self.actuallyShowDomains &&
          self.cellFill !== 'domain' &&
          !self.subFeatureRows &&
          self.showMsaLetters
        )
      },

      /**
       * #getter
       * every filtered-on annotation resolved to the visible column span it is
       * drawn across, keyed by row name. Each row is ordered longest-first so a
       * nested short domain draws on top, and each band carries the lane the
       * sub-row layout puts it in. Resolved once here instead of per canvas
       * block per redraw; the letter renderer also reads the band colors to
       * pick legible letter colors.
       */
      get domainBands() {
        const { blanks } = self
        const bands = new Map<string, DomainBand[]>()
        for (const [name, annotations] of Object.entries(
          self.annotationsByRow,
        )) {
          const rowBands = annotations
            .toSorted((a, b) => len(b) - len(a))
            .map(annotation => {
              // annotation positions are 1-based and inclusive. endCol is
              // exclusive, one past the last residue's column, so the band does
              // not extend over a following gap run. An endpoint in a hidden
              // column moves to the neighboring boundary. Bands with no visible
              // columns, or naming a missing row, are dropped.
              const start = self.seqPosToGlobalCol(name, annotation.start - 1)
              const end = self.seqEndToGlobalCol(name, annotation.end - 1)
              if (start === undefined || end === undefined) {
                return undefined
              }
              const startCol = visibleColsBefore(blanks, start)
              const endCol = visibleColsBefore(blanks, end + 1)
              return endCol > startCol
                ? { annotation, startCol, endCol }
                : undefined
            })
            .filter(notEmpty)
            // numbered after filtering, so a dropped band leaves no gap
            .map((band, stackIndex) => ({ ...band, stackIndex }))
          if (rowBands.length > 0) {
            bands.set(name, packDomainLanes(rowBands))
          }
        }
        return bands
      },

      /**
       * #getter
       * the same bands ordered by start column, for left-to-right sweeps (the
       * letter renderer walks columns and needs the band covering each one)
       */
      get domainBandsByStart() {
        return new Map(
          [...this.domainBands].map(
            ([name, bands]) =>
              [
                name,
                bands.toSorted((a, b) => a.startCol - b.startCol),
              ] as const,
          ),
        )
      },

      /**
       * #getter
       * domain annotations under the mouse, hit-tested against the exact visible
       * column span each box is drawn at (so it matches the overlay across gaps)
       */
      get mouseOverDomains(): Annotation[] {
        const { mouseCol } = self
        const name = self.mouseOverRowName
        if (name === undefined || mouseCol === undefined) {
          return noDomains
        }
        const hits = (this.domainBands.get(name) ?? [])
          .filter(b => mouseCol >= b.startCol && mouseCol < b.endCol)
          .map(b => b.annotation)
        return hits.length > 0 ? hits : noDomains
      },

      /**
       * #getter
       * the column-span highlights over the hovered cell of the alignment
       */
      get mouseOverHighlights() {
        const { mouseCol, mouseRow } = self
        return mouseCol === undefined || mouseRow === undefined
          ? []
          : self.resolvedHighlights.filter(
              h =>
                h.startCol !== undefined &&
                h.endCol !== undefined &&
                mouseCol >= h.startCol &&
                mouseCol <= h.endCol,
            )
      },

      /**
       * #getter
       * row index of the reference row (`relativeTo`), undefined when unset
       */
      get referenceRowIndex() {
        const { relativeTo } = self
        return relativeTo === undefined
          ? undefined
          : self.rowNamesSet.get(relativeTo)
      },

      /**
       * #getter
       * row indices highlighted by the current tree hover (a hovered internal
       * node highlights every tip below it). Shared by the tree and MSA overlay
       * canvases, via the memoized name->index map.
       */
      get hoveredRowIndices() {
        const { hoveredTreeNode, rowNamesSet } = self
        return hoveredTreeNode
          ? hoveredTreeNode.descendantNames
              .map(name => rowNamesSet.get(name))
              .filter(notEmpty)
          : []
      },

      /**
       * #getter
       * contiguous runs of `highlightedColumns`, so a run of highlighted columns
       * draws as one bordered band. Memoized because the overlay canvas redraws
       * on every mouse move.
       */
      get highlightedColumnRuns() {
        return consecutiveRuns(
          [...(self.highlightedColumns ?? [])].toSorted((a, b) => a - b),
        ).map(([start, end]) => ({ start, end }))
      },

      /**
       * #getter
       * `selection` projected onto what is on screen, the way
       * `resolvedHighlights` projects a column span and a row set. A
       * selection whose columns are all hidden, or whose rows are all
       * collapsed away or unknown, resolves to undefined.
       */
      get resolvedSelection(): ResolvedSelection | undefined {
        const { selection, rowNamesSet, numRows } = self
        const span =
          selection &&
          self.visibleSpan({ start: selection.start, end: selection.end })
        if (!selection || !span) {
          return undefined
        }
        const rowRuns = selection.rows
          ? consecutiveRuns(
              selection.rows
                .map(name => rowNamesSet.get(name))
                .filter(notEmpty)
                .toSorted((a, b) => a - b),
            )
          : numRows > 0
            ? [[0, numRows - 1] as [number, number]]
            : []
        return rowRuns.length > 0 ? { ...span, rowRuns } : undefined
      },

      /**
       * #getter
       * the columns and rows the selection covers, for the header's readout.
       * Columns count the file's columns from `start` to `end`, hidden ones
       * included, as `selectionFasta` copies them.
       */
      get selectionSize() {
        const resolved = this.resolvedSelection
        const span = self.selectionFileSpan
        return resolved && span
          ? {
              columns: span.end - span.start + 1,
              rows: sum(resolved.rowRuns.map(([a, b]) => b - a + 1)),
            }
          : undefined
      },

      /**
       * #getter
       * the selected block as FASTA: the selected rows on screen, top to
       * bottom, each with its letters across the file's columns from `start`
       * to `end`, gaps included
       */
      get selectionFasta() {
        const { rowNames } = self
        const resolved = this.resolvedSelection
        const span = self.selectionFileSpan
        if (!resolved || !span) {
          return ''
        }
        const rows = resolved.rowRuns
          .flatMap(([first, last]) => rowNames.slice(first, last + 1))
          .flatMap(name => {
            const seq = self.rowSequence(name)
            return seq === undefined ? [] : [[name, seq] as const]
          })
        return blockFasta(rows, span.start, span.end)
      },

      /**
       * #method
       * per-column summary statistics: consensus residue and its identity
       * fraction, both conservation scores, gap fraction, and the sorted non-gap
       * residue distribution. undefined past the end of the alignment or for an
       * all-gap column.
       */
      columnStatsAt(col: number): ColumnStats | undefined {
        const { colStats, conservation, propertyConservation } = self
        return columnStats({
          col,
          colStats,
          conservation,
          propertyConservation,
        })
      },

      /**
       * #method
       */
      getRowData(name: string) {
        return {
          data: self.MSA?.getRowData(name),
          rowData: self.rowDataOf(name),
        }
      },

      /**
       * #getter
       * each encoding with its scale resolved against the values its field
       * takes: a feature channel reads them across every feature loaded, every
       * other channel across the row table. Resolved once per change of that
       * table or the encodings, never per row per frame.
       */
      get resolvedEncodings(): ResolvedEncoding[] {
        const hidden = self.activeHiddenCategories
        return this.colorEncodings.map(encoding => {
          const table = encodingTable(encoding)
          const scale = this.scaleOf(encoding, table)
          return {
            channel: encoding.channel,
            field: encoding.field,
            ...scale,
            colorOf: unhiddenColorOf(
              scale.colorOf,
              hidden.get(table)?.get(encoding.field),
            ),
          }
        })
      },

      /**
       * #getter
       * the encodings feeding a color channel, each read through a scale
       */
      get colorEncodings() {
        return self.encodings.filter(isColorEncoding)
      },

      /**
       * #method
       * the encoding feeding a channel, undefined when none does
       */
      encodingFor(channel: ColorEncodingChannel) {
        return this.resolvedEncodings.find(e => e.channel === channel)
      },

      /**
       * #getter
       * every color object the encodings, the row panels and the column
       * tracks declare, keyed by declaration (`declarationKey`) and resolved
       * once over the union of the values its records' fields take, so a
       * value two strips share takes one color in both. A feature field reads
       * every feature loaded, so hiding a type in the filter dialog leaves the
       * rest in their colors, and its legend lists the values of the drawn
       * features. A column track reads its own values.
       */
      get resolvedScales() {
        const rows = Object.values(self.rowData)
        const { tree } = self
        const nodes = preorder(tree).filter(
          node => node !== tree && node.children.length > 0,
        )
        const valuesOf = (record: ColorRecord) => {
          const { field } = record.channel
          return record.table === 'rows'
            ? { values: rows.map(row => row?.[field]) }
            : record.table === 'nodes'
              ? { values: nodes.map(node => nodeField(node, field)) }
              : record.table === 'columns'
                ? { values: record.values }
                : record.annotations
                  ? {
                      values: featureValues(record.annotations, field),
                      shown: featureValues(record.annotations, field),
                    }
                  : {
                      values: featureValues(self.allAnnotations, field),
                      shown: featureValues(self.typeFilteredAnnotations, field),
                    }
        }
        return resolveShared(
          self.colorRecords.map((record): ScaleUse => ({
            spec: record.channel,
            field: record.channel.field,
            table: record.table,
            ...valuesOf(record),
          })),
        )
      },

      /**
       * #method
       * the shared scale a record's color object resolves to
       */
      scaleOf(channel: ColorChannel, table: ScaleTable): SharedScale {
        return this.resolvedScales.get(
          declarationKey({ spec: channel, field: channel.field, table }),
        )!
      },

      /**
       * #getter
       * each row panel's scale resolved against the values its field takes,
       * giving the colors, labels and legend entries, and a bar or point
       * panel's value scale. Reads no cell size, so a zoom reuses it and the
       * legends built from it.
       */
      get rowPanelScales(): RowPanelScale[] {
        const { rowData } = self
        const { fillPalette, featureFillEncoding, featureLabels } = this
        const annotations = self.filteredAnnotations
        const hiddenRows = self.activeHiddenCategories.get('rows')
        const hiddenOf = (field: string) => hiddenRows?.get(field)
        const colorPart = (color: ColorChannel | undefined) => {
          const scale = color ? this.scaleOf(color, 'rows') : undefined
          return {
            colorField: color?.field,
            colors:
              color && scale
                ? colorByRow(
                    rowData,
                    color.field,
                    unhiddenColorOf(scale.colorOf, hiddenOf(color.field)),
                  )
                : new Map<string, string>(),
            hiddenRows: color
              ? rowsHolding(rowData, color.field, hiddenOf(color.field))
              : new Set<string>(),
            legendKey: scale?.key,
            legendTitle: scale?.title,
            legendNote: scale?.note,
            legend: scale?.items ?? [],
          }
        }
        return self.rowPanels.map((panel): RowPanelScale => {
          if (panel.kind === 'bar' || panel.kind === 'point') {
            const { x, color } = panel.encoding
            const values = rowNumbers(rowData, x.field)
            return {
              kind: panel.kind,
              field: x.field,
              header: panel.header ?? x.field,
              values,
              valueScale: resolveValueScale(
                x.scale,
                values.values(),
                panel.kind === 'bar',
              ),
              size:
                panel.kind === 'point'
                  ? (panel.size ?? defaultPointSize)
                  : defaultPointSize,
              ...colorPart(color),
            }
          } else if (panel.kind === 'text') {
            const { text, color } = panel.encoding
            return {
              kind: panel.kind,
              field: text.field,
              header: panel.header ?? text.field,
              texts: rowTexts(rowData, text.field),
              ...colorPart(color),
            }
          } else if (panel.kind === 'features') {
            const fill = fieldChannel(panel.encoding?.fill)
            const constant = constantColor(panel.encoding?.fill)
            const encoding = fill
              ? { field: fill.field, ...this.scaleOf(fill, 'features') }
              : constant === undefined
                ? featureFillEncoding
                : undefined
            const label = panel.encoding?.text?.field
            return {
              kind: panel.kind,
              x: panel.x,
              header: panel.header ?? '',
              field: encoding?.field,
              legendKey: encoding?.key,
              legendTitle: encoding?.title,
              colors:
                fill || constant !== undefined
                  ? featureColorMap(
                      annotations,
                      encoding,
                      annotation =>
                        constant ?? fillPalette[annotation.accession]!,
                    )
                  : this.featureColors,
              labels: label
                ? featureLabelMap(annotations, label)
                : featureLabels,
              legend:
                encoding?.items ??
                (constant === undefined ? this.domainLegendItems : []),
              legendNote: encoding?.note,
            }
          } else {
            const { fill } = panel.encoding
            const { colorOf, items, note, key, title } = this.scaleOf(
              fill,
              'rows',
            )
            return {
              kind: panel.kind,
              field: fill.field,
              header: panel.header ?? fill.field,
              legendKey: key,
              legendTitle: title,
              legendNote: note,
              colors: colorByRow(
                rowData,
                fill.field,
                unhiddenColorOf(colorOf, hiddenOf(fill.field)),
              ),
              legend: items,
            }
          }
        })
      },

      /**
       * #getter
       * each features track's fill and label per span, keyed by track id: a
       * span's own `color` first, then the `fill` scale over one of its
       * fields, then `fill.value`, or the track's `color` while `fill` is
       * unset. Reads no cell size or hidden column, so a zoom or a gap toggle
       * reuses it.
       */
      get featureTrackScales() {
        return new Map(
          self.columnTracks
            .filter(track => track.kind === 'features')
            .map(track => {
              const annotations = trackAnnotations(track)
              const written = track.encoding?.fill
              const fill = fieldChannel(written)
              const scale = fill ? this.scaleOf(fill, 'features') : undefined
              const unscaled =
                constantColor(written) ??
                (written === undefined ? track.color : undefined) ??
                UNSCALED_FEATURE
              const label = track.encoding?.text?.field
              return [
                track.id,
                {
                  colors: featureColorMap(
                    annotations,
                    fill && scale ? { field: fill.field, ...scale } : undefined,
                    () => unscaled,
                  ),
                  labels: label
                    ? featureLabelMap(annotations, label)
                    : undefined,
                  scale,
                },
              ] as const
            }),
        )
      },

      /**
       * #getter
       * each bar, strip, text and arc track's colors, keyed by track id, for
       * the tracks whose `encoding.color` or `color` sets them: the shared
       * scale its values read through, if any, `colorOf` over a value, the
       * color of each visible column's bar or strip cell, and a text track's
       * color per upper-case character. A value hidden through the legend
       * paints nothing, and `hiddenColumns` marks the columns holding one. An
       * identity scale paints each value that names a color. An arc's own
       * `color` wins over the scale at draw time.
       */
      get columnTrackColors() {
        const hiddenColumns = self.activeHiddenCategories.get('columns')
        return new Map(
          self.columnTracks.flatMap(track => {
            const channel = trackColorChannel(track)
            const scale = channel ? this.scaleOf(channel, 'columns') : undefined
            const identity = scale?.kind === 'identity'
            const hidden = channel
              ? hiddenColumns?.get(channel.field)
              : undefined
            const isHidden = (value: string | undefined) =>
              value !== undefined && !!hidden?.has(value)
            const colorOf = (value: string | undefined) =>
              isHidden(value)
                ? undefined
                : scale?.kind === 'identity'
                  ? paintableColor(scale.colorOf(value))
                  : scale?.colorOf(value)
            const constant = trackConstantColor(track)
            const raw = self.columnTrackContent.get(track.id)?.raw
            const letters = [...new Set(track.data ?? '')].flatMap(letter => {
              const value = letterValue(letter)
              const color =
                value === undefined
                  ? undefined
                  : scale
                    ? colorOf(value)
                    : constant
              return value === undefined || color === undefined
                ? []
                : [[value, color] as const]
            })
            return scale || constant !== undefined
              ? [
                  [
                    track.id,
                    {
                      scale,
                      colorOf,
                      isHidden,
                      identity,
                      columns: raw?.map(v =>
                        scale
                          ? colorOf(numberText(v))
                          : v === undefined
                            ? undefined
                            : constant,
                      ),
                      hiddenColumns: hidden
                        ? raw?.map(v => isHidden(numberText(v)))
                        : undefined,
                      letters:
                        track.kind === 'text'
                          ? Object.fromEntries(letters)
                          : undefined,
                    },
                  ] as const,
                ]
              : []
          }),
        )
      },

      /**
       * #getter
       * each row panel with its scale from `rowPanelScales` and its geometry:
       * the pixel column it draws in and, for a features panel, the spans per
       * row. Resolved once per change of those inputs, never per block per
       * frame.
       */
      get resolvedRowPanels(): ResolvedRowPanel[] {
        const scales = this.rowPanelScales
        let offsetX = 0
        return self.rowPanels.map((panel, index) => {
          const width = rowPanelWidth(panel, self)
          const base = { id: `rowpanel-${index}`, width, offsetX }
          offsetX += width
          const scale = scales[index]!
          if (panel.kind === 'features' && scale.kind === 'features') {
            const align = panel.transform?.[0]
            return {
              ...base,
              ...scale,
              ...featurePanelSpans({
                panel,
                width,
                colWidth: self.colWidth,
                domainBands: this.domainBands,
                annotationsByRow: self.annotationsByRow,
                shifts: align
                  ? this.featureAlignShifts.get(align.on)
                  : undefined,
              }),
            }
          } else if (scale.kind === 'features') {
            throw new Error(`row panel ${index} has a features scale`)
          } else if (scale.kind === 'strip' || scale.kind === 'text') {
            return { ...base, ...scale }
          } else {
            const { valueScale, ...rest } = scale
            return {
              ...base,
              ...rest,
              axis: valuePanelAxis(scale.kind, valueScale, width, scale.size),
            }
          }
        })
      },

      /**
       * #getter
       * the shift an `align` transform gives each row, keyed by the feature
       * name it aligns on: the offset putting the first feature of that name
       * at zero. A row carrying no such feature is absent, and keeps its own
       * origin.
       */
      get featureAlignShifts(): Map<string, Map<string, number>> {
        const names = new Set(
          self.rowPanels.flatMap(panel =>
            panel.kind === 'features' && panel.x === 'position'
              ? (panel.transform ?? []).map(t => t.on)
              : [],
          ),
        )
        return new Map(
          [...names].map(on => [
            on,
            new Map(
              Object.entries(self.annotationsByRow)
                .map(([name, annotations]) => {
                  const hit = annotations.find(a => featureName(a) === on)
                  return hit ? ([name, 1 - hit.start] as const) : undefined
                })
                .filter(notEmpty),
            ),
          ]),
        )
      },

      /**
       * #getter
       * the color the `tipLabel` channel gives each row, by row name. Undefined
       * when no encoding names the channel, which leaves the labels the theme's
       * text color.
       */
      get tipLabelColors(): Map<string, string> | undefined {
        const encoding = this.encodingFor('tipLabel')
        return encoding
          ? colorByRow(self.rowData, encoding.field, encoding.colorOf)
          : undefined
      },

      /**
       * #getter
       * the wash the `rowTint` channel draws over each row, indexed by row, or
       * undefined when no encoding names the channel. The overlay draws these,
       * so a tint stays out of the raster tile cache and its keys.
       */
      get rowTints(): (string | undefined)[] | undefined {
        const encoding = this.encodingFor('rowTint')
        if (!encoding) {
          return undefined
        }
        const colors = colorByRow(
          self.rowData,
          encoding.field,
          encoding.colorOf,
        )
        return self.rowNames.map(name => {
          const color = colors.get(name)
          return color && withAlpha(color, rowTintAlpha)
        })
      },

      /**
       * #getter
       * the color the `branch` channel gives each tree edge, by the node id at
       * the edge's far end, or undefined when no encoding names the channel. A
       * node takes the field value its tips agree on, so a clade of one value
       * colors down from where it splits off, and a node whose tips disagree or
       * whose value has no color is absent and draws in the default color.
       *
       * The pass runs over the whole tree, never `root`, so a collapsed or
       * focused clade keeps the color the full tree gives it.
       */
      get branchColors(): Map<string, string> | undefined {
        const encoding = this.encodingFor('branch')
        if (!encoding) {
          return undefined
        }
        const order = preorder(self.tree)
        const values = new Map<NodeWithIds, string | undefined>()
        const colors = new Map<string, string>()
        for (let i = order.length - 1; i >= 0; i--) {
          const node = order[i]!
          const value =
            node.children.length > 0
              ? sharedValue(node.children.map(child => values.get(child)))
              : self.rowDataOf(node.name)?.[encoding.field]
          values.set(node, value)
          const color =
            value === undefined ? undefined : encoding.colorOf(value)
          if (color) {
            colors.set(node.id, color)
          }
        }
        return colors
      },

      /**
       * #getter
       * the fill the `nodePoint` channel gives each internal node's bubble, by
       * node id, or undefined when no encoding names the channel. A node with
       * no label, or one whose value the scale gives no color, keeps the
       * plain bubble. The pass runs over the whole tree, so a collapsed or
       * focused clade keeps its colors.
       */
      get nodePointColors(): Map<string, string> | undefined {
        const encoding = this.encodingFor('nodePoint')
        return encoding
          ? new Map(
              preorder(self.tree).flatMap(node => {
                const color = encoding.colorOf(nodeField(node, encoding.field))
                return color ? [[node.id, color] as const] : []
              }),
            )
          : undefined
      },
    }))
    .actions(self => ({
      /**
       * #action
       */
      setHeaderHeight(arg: number) {
        self.headerHeight = arg
      },
      /**
       * #action
       */
      setHideHeader(arg: boolean) {
        self.hideHeader = arg
      },
      /**
       * #action
       */
      setEmbeddedMode(arg: boolean) {
        self.embeddedMode = arg
      },
      /**
       * #action
       */
      setImportForm(arg: boolean) {
        self.importForm = arg
      },
      /**
       * #action
       * focus the subtree a click `y` pixels down the tree overview lands on.
       * A click inside the box already drawn there clears the focus, the way
       * clicking the focused branch again does.
       */
      treeOverviewClick(y: number) {
        const hit = self.treeOverviewHit(y)
        const focus = self.treeOverviewFocusRows
        const inside =
          !!focus && !!hit && hit.rows[0] >= focus[0] && hit.rows[1] <= focus[1]
        self.setShowOnly(inside || !hit ? undefined : hit.id)
      },
      /**
       * #action
       * resize every track sharing a `heightKey`; see `trackHeights`
       */
      setTrackHeight(heightKey: string, height: number) {
        self.trackHeights.set(heightKey, height)
      },
      /**
       * #action
       * Return to the import form: reset every property not in
       * `preservedOnReset` to its default, then clear the file-derived
       * volatiles applySnapshot does not touch.
       */
      reset() {
        self.resetCount++
        self.loadWarnings = []
        self.dismissedWarnings = []
        self.setStatus(undefined)
        applySnapshot(
          self,
          Object.fromEntries(
            Object.entries(getSnapshot(self) as Record<string, unknown>).filter(
              ([key]) => preservedOnReset.has(key),
            ),
          ),
        )
        self.setError(undefined)
        self.setAnnotations([])
        self.setHighlightedColumns(undefined)
        self.transientHighlights = {}
        self.setMousePos(undefined, undefined)
        self.setMouseClickPos(undefined, undefined)
        self.setHoveredTreeNode(undefined)
        self.setHoveredHighlight(undefined)
      },
      /**
       * #action
       */
      async exportSVG(opts: ExportSvgOptions) {
        const { renderToSvg } = await import('./renderToSvg.tsx')
        if (isStateTreeNode<MsaViewStateModel>(self)) {
          const html = await renderToSvg(self, opts)
          const blob = new Blob([html], { type: 'image/svg+xml' })
          saveAs(blob, exportFileName(self.msaFilehandle, 'svg'))
        }
      },
      /**
       * #action
       * save `treeNewick` as a file
       */
      exportNewick() {
        const blob = new Blob([self.treeNewick], { type: 'text/plain' })
        saveAs(
          blob,
          exportFileName(
            self.treeFilehandle ?? self.msaFilehandle,
            'nwk',
            'tree',
          ),
        )
      },
      /**
       * #action
       * show or hide an annotation type. Only a choice that differs from the
       * type's default is recorded; see `turnedOffFeatures`
       */
      setFilter(accession: string, shown: boolean) {
        // only a departure from the accession's default is recorded
        if (shown === self.defaultOffAccessions.has(accession)) {
          self.turnedOffFeatures.set(accession, !shown)
        } else {
          self.turnedOffFeatures.delete(accession)
        }
      },
      /**
       * #action
       * replace the `{field, value}` pairs the legend hides
       */
      setHiddenCategories(hidden: HiddenCategory[]) {
        self.hiddenCategories.replace(hidden)
      },
      /**
       * #action
       * a click on a legend row: hides the value it keys, or shows it again.
       * A row of the accession key turns its feature type off or on in the
       * filter dialog's `turnedOffFeatures`
       */
      toggleLegendItem(hides: LegendHides, value: string) {
        if (hides.kind === 'featureType') {
          this.setFilter(value, self.featureOff(value))
        } else {
          self.hiddenCategories.replace(
            toggledCategories(self.hiddenCategories, hides.fields, value),
          )
        }
      },

      /**
       * #action
       */
      fit() {
        // two passes: each direction's viewport depends on whether the other
        // overflows (the minimap takes height, the vertical scrollbar width).
        // Fit shrinks an alignment into the window but never grows one past
        // the default cell size, which would stretch a small alignment's rows
        // and columns out of proportion
        transaction(() => {
          for (let pass = 0; pass < 2; pass++) {
            this.fitHorizontally(defaultColWidth)
            this.fitVertically(defaultRowHeight)
          }
        })
      },
      /**
       * #action
       */
      fitVertically(maxRowHeight: number = maxCellSize) {
        if (self.numRows > 0) {
          self.setRowHeight(
            clamp(
              self.msaAreaHeight / self.numRows,
              minRowHeight,
              maxRowHeight,
            ),
          )
        }
        self.scrollY = 0
      },
      /**
       * #action
       * zoom and scroll so a span fills the alignment's width, in highlight
       * coordinates (see visibleSpan). Does nothing before the viewer knows
       * its width, or for a span that resolves to no visible column.
       */
      zoomToRegion(region: Region) {
        const span = self.visibleSpan(region)
        if (!span || !self.viewInitialized) {
          return
        }
        transaction(() => {
          self.setColWidth(
            clamp(
              self.msaCanvasWidth / (span.endCol - span.startCol + 1),
              minColWidth,
              maxCellSize,
            ),
          )
          self.scrollX = clamp(
            -span.startCol * self.colWidth,
            self.maxScrollX,
            0,
          )
        })
      },
      /**
       * #action
       * zoomToRegion, and for a region naming a row, also scroll that row to
       * the middle of the alignment, as Go to does. What `region` opens on; a
       * caller following a range as it moves wants zoomToRegion alone, which
       * leaves the reader's vertical scroll where they put it.
       */
      revealRegion(region: Region) {
        transaction(() => {
          this.zoomToRegion(region)
          const row =
            region.row === undefined
              ? undefined
              : self.rowNamesSet.get(region.row)
          if (row !== undefined && self.viewInitialized) {
            self.setScrollY(
              -(row + 0.5) * self.rowHeight + self.msaAreaHeight / 2,
            )
          }
        })
      },
      /**
       * #action
       * zoom and scroll so the selected columns fill the alignment's width,
       * and, where the selection names its rows, so those rows fill its height
       */
      zoomToSelection() {
        const { selection, resolvedSelection } = self
        if (!selection || !resolvedSelection) {
          return
        }
        transaction(() => {
          this.zoomToRegion({ start: selection.start, end: selection.end })
          if (selection.rows && self.viewInitialized) {
            const { rowRuns } = resolvedSelection
            const first = rowRuns[0]![0]
            const last = rowRuns.at(-1)![1]
            self.setRowHeight(
              clamp(
                self.msaAreaHeight / (last - first + 1),
                minRowHeight,
                maxCellSize,
              ),
            )
            self.scrollY = clamp(-first * self.rowHeight, self.maxScrollY, 0)
          }
        })
      },
      /**
       * #action
       * select the block between two cells given as visible column and row
       * indices, the coordinates a drag reports, clamped to the alignment. A
       * cell with no `row` selects the columns across every row, and so does a
       * block spanning every row on screen.
       */
      selectBlock(
        anchor: { col: number; row?: number },
        head: { col: number; row?: number },
      ) {
        const { numColumns, numRows, rowNames } = self
        if (numColumns === 0 || numRows === 0) {
          return
        }
        const [startCol, endCol] = clampedSpan(
          anchor.col,
          head.col,
          numColumns - 1,
        )
        const [firstRow, lastRow] =
          anchor.row === undefined || head.row === undefined
            ? [0, numRows - 1]
            : clampedSpan(anchor.row, head.row, numRows - 1)
        const everyRow = firstRow === 0 && lastRow === numRows - 1
        self.setSelection({
          start: self.visibleColToGlobalCol(startCol) + 1,
          end: self.visibleColToGlobalCol(endCol) + 1,
          ...(everyRow ? {} : { rows: rowNames.slice(firstRow, lastRow + 1) }),
        })
      },
      /**
       * #action
       */
      fitHorizontally(maxColWidth: number = maxCellSize) {
        if (self.numColumns > 0) {
          // msaCanvasWidth excludes the vertical scrollbar's 20px
          self.setColWidth(
            clamp(
              self.msaCanvasWidth / self.numColumns,
              minColWidth,
              maxColWidth,
            ),
          )
        }
        self.scrollX = 0
      },

      afterCreate() {
        if (self.highlightColumns?.length) {
          self.setHighlightedColumns(self.highlightColumns)
        }

        const awaitingTree = () => !!self.treeFilehandle && !self.data.tree

        // `collapse`, `focus` and `rotate` marks seed `collapsed`, `showOnly`
        // and `rotated` once, and again after `setClades` or `clearNodeState`,
        // so expanding a seeded clade sticks, in a shared link too. A tree
        // filehandle holds it back, since `dataInitialized` is true while the
        // tree is still the flat stub.
        addDisposer(
          self,
          reaction(
            () =>
              self.dataInitialized && !awaitingTree() && !self.cladesSeeded
                ? getSnapshot(self.clades)
                : undefined,
            clades => {
              if (clades?.length) {
                self.seedCladeMarks()
              }
            },
            { fireImmediately: true, equals: compareStructural },
          ),
        )

        // zoomToRegion needs a width and resolves residues through the visible
        // columns, so this waits for both, and for a tree file whose collapsed
        // clades would hide columns and move the target after the zoom
        addDisposer(
          self,
          autorun(() => {
            const { region } = self
            if (
              region &&
              self.viewInitialized &&
              self.numColumns > 0 &&
              !awaitingTree()
            ) {
              this.revealRegion(region)
              self.setRegion(undefined)
            }
          }),
        )

        // the matchMedia query is pinned to the current device pixel ratio, so
        // each change re-registers against the new one
        if (
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function'
        ) {
          let mql = devicePixelRatioQuery()
          const onChange = () => {
            self.setHighResScaleFactor(window.devicePixelRatio)
            mql.removeEventListener('change', onChange)
            mql = devicePixelRatioQuery()
            mql.addEventListener('change', onChange)
          }
          mql.addEventListener('change', onChange)
          addDisposer(self, () => {
            mql.removeEventListener('change', onChange)
          })
        }

        installFilehandleLoader(self, {
          what: 'tree',
          getFilehandle: () => self.treeFilehandle,
          onLoad: text => {
            self.data.setTree(text)
          },
          setLoading: arg => {
            self.setLoadingTree(arg)
          },
          clearFilehandle: () => {
            self.setTreeFilehandle(undefined)
          },
        })

        // treeMetadata has no import-form step, so no loading flag or cancel
        installFilehandleLoader(self, {
          what: 'row metadata',
          optional: true,
          getFilehandle: () => self.treeMetadataFilehandle,
          onLoad: text => {
            self.data.setTreeMetadata(text)
          },
          clearFilehandle: () => {
            self.setTreeMetadataFilehandle(undefined)
          },
        })

        // parses data.gff into annotations. Clearing the text clears only the
        // annotations this autorun applied, not ones a host set directly
        let appliedGFF = false
        addDisposer(
          self,
          autorun(() => {
            const gffText = self.data.gff
            if (gffText) {
              try {
                self.applyGFFText(gffText)
                appliedGFF = true
              } catch (e) {
                console.error(e)
                self.addWarning(`The annotations did not parse: ${String(e)}`)
              }
            } else if (appliedGFF) {
              appliedGFF = false
              self.setAnnotations([])
            }
          }),
        )

        // gffFilehandle loads into data.gff, which the autorun above parses
        installFilehandleLoader(self, {
          what: 'annotations',
          optional: true,
          getFilehandle: () => self.gffFilehandle,
          onLoad: text => {
            self.data.setGFF(text)
          },
          clearFilehandle: () => {
            self.setGFFFilehandle(undefined)
          },
        })

        installFilehandleLoader(self, {
          what: 'alignment',
          getFilehandle: () => self.msaFilehandle,
          onLoad: text => {
            self.data.setMSA(text)
          },
          setLoading: arg => {
            self.setLoadingMSA(arg)
          },
          clearFilehandle: () => {
            self.setMSAFilehandle(undefined)
          },
        })

        // Keep computeds alive that are read outside reactions, so they are not
        // recomputed on every access: self.columns (and through it the
        // parseMSA result), and the column statistics that dynamic color
        // schemes and the mousemove-driven hover tooltip read.
        // xref solution https://github.com/mobxjs/mobx/issues/266#issuecomment-222007278
        // xref problem https://github.com/GMOD/react-msaview/issues/75
        addDisposer(
          self,
          autorun(() => {
            if (self.dynamicColorSchemeName) {
              readComputed(self.colStats)
            }
            if (self.showColumnStats) {
              readComputed(
                self.colStats,
                self.conservation,
                self.propertyConservation,
              )
            }
            readComputed(self.columns)
          }),
        )
      },
    }))
    .preProcessSnapshot(snapshot => liftResidueColor(snapshot))
    .postProcessSnapshot(({ data, columnTracks, ...rest }) => ({
      // stripDefault handles per-property defaults; this drops inline documents
      // whose filehandle can refetch them
      ...rest,
      ...smallColumnTracks(columnTracks, maxInlineSnapshotBytes),
      data: {
        ...(rest.treeFilehandle ? {} : { tree: data.tree }),
        ...(rest.msaFilehandle ? {} : { msa: data.msa }),
        ...(rest.treeMetadataFilehandle
          ? {}
          : { treeMetadata: data.treeMetadata }),
        ...(rest.gffFilehandle ? {} : { gff: data.gff }),
      },
    }))
}

export default stateModelFactory

export type MsaViewStateModel = ReturnType<typeof stateModelFactory>
export type MsaViewModel = Instance<MsaViewStateModel>

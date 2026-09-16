import { clamp, groupBy, notEmpty, sum } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { ElementId, FileLocation } from '@jbrowse/core/util/types/mst'
import {
  addDisposer,
  applySnapshot,
  cast,
  getSnapshot,
  isAlive,
  types,
} from '@jbrowse/mobx-state-tree'
import { autorun, transaction } from 'mobx'
import {
  generateNodeIds,
  gffToAnnotations,
  interProScanToAnnotations,
  parseEmfTree,
  parseGFF,
  parseMSA,
  parseNewick,
} from 'msa-parsers'

import { calculateBlocks } from './calculateBlocks.ts'
import { clustalXColumnColors } from './clustalX.ts'
import colorSchemes from './colorSchemes.ts'
import { columnCountsFromRows, letterOfResidueSlot } from './columnCounts.ts'
import { columnStats } from './columnStats.ts'
import { packDomainLanes } from './components/msa/packDomainLanes.ts'
import { visibleColRange } from './components/msa/visibleColRange.ts'
import TrackBlocks from './components/tracks/TrackBlocks.tsx'
import { cladeGutterWidth } from './components/tree/cladeBrackets.ts'
import {
  cladeHighlightAlpha,
  cladeHighlightColor,
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
  defaultSubFeatureRows,
  defaultTreeWidth,
  labelReferenceFontSize,
  maxCellSize,
  maxInlineSnapshotBytes,
  maxNeighborJoiningRows,
  minColWidth,
  minLetterColWidth,
  minLetterRowHeight,
  minRowHeight,
  rowPanelHeaderHeight,
  rowTintAlpha,
  scrollZoomAxes,
  segmentFeatureTypes,
  segmentShades,
} from './constants.ts'
import { createPaletteMap } from './createPaletteMap.ts'
import { exportFileName } from './exportFileName.ts'
import { fetchTextWithProgress, isAbortError } from './fetchUtils.ts'
import { flatToTree } from './flatToTree.ts'
import {
  calcDepthToLeaf,
  clusterLayout,
  collapse,
  collapsedSubtreeMaxLength,
  find,
  forEachDescendant,
  hierarchy,
  leafIndex,
  leaves,
  maxLength,
  mrca,
  nodeCoveringRows,
  setBrLength,
  sort,
  sum as hierarchySum,
} from './hierarchy.ts'
import { measureTextCanvas } from './measureTextCanvas.ts'
import { DataModelF } from './model/DataModel.ts'
import { DialogQueueSessionMixin } from './model/DialogQueue.ts'
import { MSAModelF } from './model/msaModel.ts'
import { TreeModelF } from './model/treeModel.ts'
import { calculateNeighborJoiningTree } from './neighborJoining.ts'
import { parseAsn1 } from './parseAsn1.ts'
import { calculatePropertyConservation } from './propertyConservation.ts'
import {
  globalColToVisibleCol,
  seqPosOfGlobalCol,
  visibleColToGlobalCol,
  visibleColsBefore,
} from './rowCoordinateCalculations.ts'
import { resolveScale } from './scales.ts'
import { buildSeqPosIndex } from './seqPosToGlobalCol.ts'
import { maxBitsFor } from './sequenceLogo.ts'
import { stripDefault } from './stripDefault.ts'
import {
  computeRowInsertions,
  dropBlanks,
  len,
  outlineColor,
  skipBlanks,
  transform,
  withAlpha,
} from './util.ts'
import { saveAs } from './vendor/fileSaver.ts'
import { parseWuss } from './wuss.ts'

import type { ColumnStats } from './columnStats.ts'
import type { ScrollZoomAxis } from './constants.ts'
import type { HierarchyNode } from './hierarchy.ts'
import type { ExportSvgOptions } from './renderToSvg.tsx'
import type {
  Annotation,
  Arc,
  BasicTrack,
  Cell,
  Clade,
  ResidueMappingProblem,
  ColumnTrackSpec,
  DomainBand,
  Encoding,
  EncodingChannel,
  Highlight,
  Legend,
  LegendEntry,
  NodeWithIds,
  NodeWithIdsAndLength,
  Region,
  ResidueMapping,
  ResidueSegment,
  ResolvedClade,
  ResolvedEncoding,
  ResolvedHighlight,
  ResolvedRowPanel,
  RowPanelSpec,
  RowResidue,
  StructureResidue,
  TrackKind,
  UnshareableData,
  Viewport,
} from './types.ts'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { Instance } from '@jbrowse/mobx-state-tree'
import type { InterProScanResults } from 'msa-parsers'

function parseTreeText(text: string) {
  if (text.startsWith('BioTreeContainer')) {
    return flatToTree(parseAsn1(text))
  }
  return parseNewick(text.startsWith('SEQ') ? parseEmfTree(text).tree : text)
}

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
}

// the kinds a divider resizes. The ruler is a fixed scale, and a text track
// follows the vertical zoom.
const resizableKinds = new Set<TrackKind>(['bar', 'logo', 'arc'])

const defaultOffTracks = new Set(['sequence-logo', 'position-ruler'])

// a data track carries its own height rather than its kind's, so its divider
// resizes it alone
const ownHeightKey = (id: string) => `own:${id}`

// base-pair arcs: one color for nested helices, one for pseudoknots, which cross
// them
const HELIX_ARC = '#4e79a7'
const PSEUDOKNOT_ARC = '#e15759'

// a row panel's own width, or the row height, which makes a strip cell square
function rowPanelWidth(panel: RowPanelSpec, rowHeight: number) {
  return panel.width ?? rowHeight
}

// a data track over this size stays in the live model but leaves the snapshot,
// the same rule DataModel applies to an inline document
function columnTrackSizes(tracks?: readonly ColumnTrackSpec[]) {
  return (tracks ?? []).map(t => JSON.stringify(t).length)
}

function smallColumnTracks(tracks?: ColumnTrackSpec[]) {
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
  'bgColor',
  'colorSchemeName',
  'showColumnStats',
  'drawLabels',
  'labelsAlignRight',
  'treeAreaWidth',
  'treeWidth',
  'showBranchLen',
  'drawTree',
  'drawNodeBubbles',
  'drawNodeLabels',
  'showTreeOverview',
  'overviewHeight',
  'autoTreeAreaWidth',
  'turnedOffTracks',
  'trackHeights',
  'hideGaps',
  'allowedGappyness',
  'subFeatureRows',
  'showDomainLegend',
])

// `turnedOffTracks` holds only the user's explicit choices, so a hidden-by-default
// track writes nothing into the snapshot. A file-supplied track passes its own
// `defaultOff`, since the count varies by file: a Pfam seed has a couple of #=GR
// lines, an Rfam family one per row.
function trackIsOff(
  turnedOffTracks: { get: (id: string) => boolean | undefined },
  id: string,
  defaultOff?: boolean,
) {
  return turnedOffTracks.get(id) ?? (defaultOff || defaultOffTracks.has(id))
}

// shared empty results, so observers don't see a fresh [] as a change
const noDomains: Annotation[] = []
const noClades: ResolvedClade[] = []

/**
 * The rows a clade covers and the node an `mrca` names, or undefined when the
 * clade does not resolve: a tip name the tree does not have or has twice, or a
 * leaf count `tips` disagrees with. `index` and `rowNamesSet` are the memoized
 * passes over the tree.
 */
function cladeRows(
  clade: Clade,
  root: HierarchyNode<NodeWithIds>,
  index: Map<string, HierarchyNode<NodeWithIds> | undefined>,
  rowNamesSet: Map<string, number>,
): { rows: [number, number]; nodeId?: string } | undefined {
  if (clade.range) {
    const [a, b] = clade.range.map(name =>
      index.get(name) ? rowNamesSet.get(name) : undefined,
    )
    if (a === undefined || b === undefined) {
      return undefined
    }
    const rows: [number, number] = a <= b ? [a, b] : [b, a]
    return rows[1] - rows[0] + 1 === clade.tips ? { rows } : undefined
  }
  const node = clade.mrca ? mrca(root, clade.mrca, index) : undefined
  if (!node) {
    return undefined
  }
  const tips = leaves(node)
  if (tips.length !== clade.tips) {
    return undefined
  }
  let first = Infinity
  let last = -Infinity
  for (const tip of tips) {
    const row = rowNamesSet.get(tip.data.name)
    if (row !== undefined) {
      first = Math.min(first, row)
      last = Math.max(last, row)
    }
  }
  return first <= last
    ? { rows: [first, last], nodeId: node.data.id }
    : undefined
}

/**
 * Every clade that resolves, with its fill color settled, against the leaf
 * order `rowNamesSet` gives. The tree panel resolves against the displayed
 * rows and the overview against its own, so both take the tree they draw. A
 * `range` record names no node, so `collapse` and `focus`, which need one,
 * drop it.
 */
function resolveClades(
  clades: Clade[],
  root: HierarchyNode<NodeWithIds>,
  rowNamesSet: Map<string, number>,
): ResolvedClade[] {
  const index = leafIndex(root)
  return clades.flatMap(clade => {
    const resolved = cladeRows(clade, root, index, rowNamesSet)
    const seeding = clade.mark === 'collapse' || clade.mark === 'focus'
    return resolved && !(seeding && resolved.nodeId === undefined)
      ? [
          {
            ...resolved,
            mark: clade.mark,
            color: withAlpha(
              clade.color ?? cladeHighlightColor,
              cladeHighlightAlpha,
            ),
            markColor: clade.color,
            label: clade.label,
          },
        ]
      : []
  })
}

/**
 * The tree with the display transforms applied: leaf counts summed, children
 * sorted by branch length, `showOnly` taken as the new root, and each
 * `collapsed` clade folded. The overview builds the same tree without the
 * focus, so it shows the focused subtree inside the whole.
 */
function buildTreeRoot(
  tree: NodeWithIds,
  collapsed: readonly string[],
  showOnly?: string,
) {
  let hier = hierarchy(tree, d => d.children)
  hierarchySum(hier, d => (d.children.length > 0 ? 0 : 1))
  sort(hier, (a, b) => (a.data.length ?? 1) - (b.data.length ?? 1))

  if (showOnly) {
    const res = find(hier, n => n.data.id === showOnly)
    if (res) {
      hier = res
    }
  }

  for (const collapsedId of collapsed) {
    const node = find(hier, n => n.data.id === collapsedId)
    if (node) {
      if (node.children) {
        collapse(node)
      } else if (node.parent?.children) {
        node.parent.children = node.parent.children.filter(
          c => c.data.id !== collapsedId,
        )
      }
    }
  }

  return hier
}

// the inclusive tip indices a node covers, from the row-space extent
// clusterLayout writes to xMin/xMax as tip centers
function tipRange(node: HierarchyNode): [number, number] {
  return [Math.round(node.xMin! - 0.5), Math.round(node.xMax! - 0.5)]
}

// the channels reading the feature table; every other channel reads rowData
const featureChannels = new Set<EncodingChannel>([
  'featureFill',
  'featureLabel',
])

// the value a feature gives an encoded field: an Annotation property, else one
// of the GFF attributes the parser kept
function featureField(annotation: Annotation, field: string) {
  const own = (annotation as unknown as Record<string, unknown>)[field]
  const value = own ?? annotation.attributes?.[field]
  return typeof value === 'string' ? value : undefined
}

// seqPos -> column indexes per row, keyed on the parse so they are garbage
// collected with it. A computed would rebuild every row's index when read
// outside a reactive context.
const seqPosIndexCache = new WeakMap<object, Map<string, Int32Array>>()

// A segment is a 1:1 run. A segment whose sides differ in length is malformed,
// and the lookups treat it like an uncovered position.
function sameLength(segment: ResidueSegment) {
  return (
    segment.rowEnd - segment.rowStart ===
    segment.structEnd - segment.structStart
  )
}

// fit() divides the viewport by the row or column count and multiplies back, so
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

// preorder, so reversing the list puts every node after its descendants
function preorder(tree: NodeWithIds) {
  const order: NodeWithIds[] = []
  const stack = [tree]
  while (stack.length > 0) {
    const node = stack.pop()!
    order.push(node)
    for (const child of node.children) {
      stack.push(child)
    }
  }
  return order
}

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
 */
function stateModelFactory() {
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
         * focus on particular subtree
         */
        showOnly: types.maybe(types.string),
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
        data: types.optional(DataModelF(), {
          tree: '',
          msa: '',
          treeMetadata: '',
        }),

        /**
         * #property
         * the user's explicit hide choices per annotation accession, keyed by
         * accession with the value meaning "off", like `turnedOffTracks`. An
         * untouched accession is absent and drawn, so the shared URL grows
         * only with the user's filters
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
         * Persists in the snapshot and the URL.
         */
        highlights: stripDefault(types.array(types.frozen<Highlight>()), []),
        /**
         * #property
         * clades of the tree with a mark drawn over them. `mrca` names tips
         * whose common ancestor is the clade, or `range` its first and last
         * tip in display order, and `tips` is the leaf count the producer
         * measured. See docs/layers.md
         */
        clades: stripDefault(types.array(types.frozen<Clade>()), []),
        /**
         * #property
         * what the viewer's own marks read from `rowData`:
         * `{channel, field, scale?}` per channel, where `channel` is
         * `tipLabel` or `rowTint`. See docs/layers.md
         */
        encodings: stripDefault(types.array(types.frozen<Encoding>()), []),
        /**
         * #property
         * panels drawn between the tree and the alignment, one cell per row:
         * `{kind: "strip", field, scale?, width?, header?}` colors each row
         * from a `rowData` field. See docs/layers.md
         */
        rowPanels: stripDefault(types.array(types.frozen<RowPanelSpec>()), []),
      }),
    )
    .volatile(() => ({
      /**
       * #volatile
       */
      headerHeight: 0,
      /**
       * #volatile
       * leaves the toolbar out, for a host drawing its own controls. Kept out
       * of the snapshot so a link opened in the full app shows the toolbar.
       */
      hideHeader: false,
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
       * resize handle width between tree and msa area, px
       */
      resizeHandleWidth: 5,

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
       * alignment itself
       */
      warnings: [] as string[],

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
       * set error state
       */
      setError(error?: unknown) {
        self.error = error
      },

      /**
       * #action
       * record a non-fatal load problem: a layer that failed to load, a file
       * that failed to parse
       */
      addWarning(warning: string) {
        self.warnings = [...self.warnings, warning]
      },

      /**
       * #action
       */
      clearWarnings() {
        self.warnings = []
      },

      /**
       * #action
       * declare that this host restores the loaded documents itself, which
       * hides the "Not in the link" warning. See `hostCarriesData`
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
      setHighlights(highlights: Highlight[]) {
        self.highlights.replace(highlights)
      },

      /**
       * #action
       * replace the clades the viewer marks (see docs/layers.md)
       */
      setClades(clades: Clade[]) {
        self.clades.replace(clades)
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
      },

      /**
       * #action
       * set col width (px)
       */
      setColWidth(n: number) {
        self.colWidth = n
      },

      /**
       * #action
       * switch to another alignment of a multi-alignment file (Stockholm).
       * Clears the collapsed node ids, the subtree in focus, the reference row
       * and the scroll position, which all refer to the previous alignment
       */
      setCurrentAlignment(n: number) {
        if (n === self.currentAlignment) {
          return
        }
        transaction(() => {
          self.currentAlignment = n
          self.collapsed.clear()
          this.setShowOnly(undefined)
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
        self.msaFilehandle = msaFilehandle
      },

      /**
       * #action
       */
      setTreeFilehandle(treeFilehandle?: FileLocationType) {
        self.treeFilehandle = treeFilehandle
      },

      /**
       * #action
       */
      setTreeMetadataFilehandle(treeMetadataFilehandle?: FileLocationType) {
        self.treeMetadataFilehandle = treeMetadataFilehandle
      },

      /**
       * #action
       */
      setGFFFilehandle(gffFilehandle?: FileLocationType) {
        self.gffFilehandle = gffFilehandle
      },

      /**
       * #action
       */
      setMSA(result: string) {
        self.data.setMSA(result)
      },

      /**
       * #action
       */
      setTree(result: string) {
        self.data.setTree(result)
      },

      /**
       * #action
       */
      setTreeMetadata(result: string) {
        self.data.setTreeMetadata(result)
      },

      /**
       * #action
       * store the GFF text in the snapshot like the alignment and tree. The
       * parsed annotations are volatile and a blob filehandle is cleared once
       * read, so the text is the only persisted copy. An autorun parses it
       * into annotations.
       */
      setGFF(result: string) {
        self.data.setGFF(result)
      },
    }))

    .views(self => ({
      /**
       * #getter
       * hideGaps takes effect when there are collapsed rows or allowedGappyness < 100
       */
      get hideGapsEffective() {
        return (
          self.hideGaps &&
          (self.collapsed.length > 0 || self.allowedGappyness < 100)
        )
      },
      /**
       * #getter
       */
      get realAllowedGappyness() {
        return this.hideGapsEffective ? self.allowedGappyness : 100
      },
      /**
       * #getter
       */
      get actuallyShowDomains() {
        return self.showDomains && self.annotations.length > 0
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
        return self.volatileWidth
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get colorScheme() {
        // colorSchemeName is a free string (menus, snapshots, URL params), so a
        // stale name falls back to the default
        return (
          colorSchemes[self.colorSchemeName] ??
          colorSchemes[defaultColorSchemeName]!
        )
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
        return self.annotations.length === 0
      },

      /**
       * #getter
       * loaded documents left out of the snapshot, largest first. A file opened
       * from disk or pasted in becomes inline text, and DataModel drops an
       * inline document past `maxInlineSnapshotBytes`.
       *
       * The header lists these, and the standalone app stops rewriting the
       * address bar while the list is non-empty, so a copied link does not
       * open an empty viewer unannounced. A document fetched from a URL never
       * appears here, since the snapshot keeps its filehandle.
       *
       * Empty when `hostRestoresData` is true.
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
          .sort((a, b) => b.bytes - a.bytes)
      },
      menuItems() {
        return []
      },
      /**
       * #getter
       * the row table: extra fields per row, keyed by row name, which the
       * `encodings` channels read. It is stored as the JSON string
       * `data.treeMetadata`, the name that travels in existing links, so the
       * inline size limit and `treeMetadataFilehandle` cover it. labelWidthMap
       * reads it on every layout, so a malformed user-supplied file returns {}
       * instead of throwing out of rendering.
       */
      get rowData(): Record<string, Record<string, string> | undefined> {
        const text = self.data.treeMetadata
        if (!text) {
          return {}
        }
        try {
          const parsed: unknown = JSON.parse(text)
          return typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, Record<string, string> | undefined>)
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
        return [...fields].sort((a, b) => a.localeCompare(b))
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
       */
      get numColumns() {
        return (this.MSA?.getWidth() ?? 0) - this.blanks.length
      },

      /**
       * #getter
       */
      get tree(): NodeWithIds {
        const text = self.data.tree
        return text
          ? generateNodeIds(parseTreeText(text))
          : (this.MSA?.getTree() ?? {
              noTree: true,
              children: [],
              id: 'empty',
              name: 'empty',
            })
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
       * clade. A `range` record names no node, so `collapse` and `focus`, which
       * need one, drop it.
       */
      get resolvedClades(): ResolvedClade[] {
        if (self.clades.length === 0) {
          return noClades
        }
        return resolveClades(
          self.clades,
          hierarchy(this.tree, d => d.children),
          this.rowNamesSet,
        )
      },
      /**
       * #getter
       * the pixel column reserved at the right of the tree area for the bracket
       * mark, which the tip labels and the tree itself stay clear of. Zero
       * where no clade draws a bar or a label.
       */
      get cladeGutterWidth() {
        return cladeGutterWidth({
          clades: this.resolvedClades,
          rowHeight: self.rowHeight,
          fontSize: this.fontSize,
        })
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
        return buildTreeRoot(this.tree, self.collapsed, self.showOnly)
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
        const root = buildTreeRoot(this.tree, self.collapsed)
        const numTips = leaves(root).length
        clusterLayout(root, numTips, 1)
        const rootLen = Math.max(root.data.length || 0, 0)
        const extent = maxLength(root) - rootLen
        setBrLength(root, -rootLen, extent ? 1 / extent : 0)
        return {
          root,
          numTips,
          maxDepthToLeaf: calcDepthToLeaf(root),
          showBranchLen: self.showBranchLen && extent > 0,
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
        const rowNames = new Map(
          leaves(layout.root).map((leaf, index) => [leaf.data.name, index]),
        )
        return resolveClades(self.clades, layout.root, rowNames)
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
        return sum(self.rowPanels.map(p => rowPanelWidth(p, self.rowHeight)))
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
          self.treeAreaWidth -
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
        return self.treeAreaWidth - self.marginLeft - this.cladeGutterWidth
      },
      /**
       * #getter
       */
      get blanks() {
        const { hideGapsEffective, realAllowedGappyness } = self
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
        // alignment; the widest row defines the column count and a row that
        // stops early counts as gapped for the remainder
        const numCols = strs.reduce((max, str) => Math.max(max, str.length), 0)
        const numRows = strs.length
        const threshold = Math.ceil((realAllowedGappyness / 100) * numRows)
        const blankCounts = new Uint32Array(numCols)
        for (let j = 0; j < numRows; j++) {
          const str = strs[j]!
          const len = str.length
          for (let i = 0; i < numCols; i++) {
            // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
            if (i >= len || (str.charCodeAt(i) - 45) >>> 0 <= 1) {
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
       * Returns a map of row name to array of insertions with display position and letters
       */
      get insertionPositions() {
        const { blanks, rows } = this
        if (blanks.length === 0 || !self.hideGapsEffective) {
          return new Map<string, { pos: number; letters: string }[]>()
        }
        const result = new Map<string, { pos: number; letters: string }[]>()
        for (const [name, seq] of rows) {
          const insertions = computeRowInsertions(blanks, seq)
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
       * #getter
       * every sequence in the alignment, keyed by row name, including rows a
       * collapsed clade hides. `rows` holds only the rows on screen; lookups
       * by row name use this
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
        const { hideGapsEffective } = self
        return this.rows.map(([, str]) =>
          (hideGapsEffective
            ? skipBlanks(this.blanks, str)
            : str
          ).toUpperCase(),
        )
      },
      /**
       * #getter
       */
      get fontSize() {
        return Math.min(Math.max(6, self.rowHeight - 3), 18)
      },
      /**
       * #getter
       */
      get colStats() {
        return columnCountsFromRows(this.columns2d)
      },

      /**
       * #getter
       * Detects sequence type based on letters present in the alignment.
       * Returns 'dna', 'rna', or 'amino'.
       */
      get sequenceType(): 'dna' | 'rna' | 'amino' {
        const letters = this.colStats.lettersPresent
        // isDna already excludes U (not in the DNA set) and isRna excludes T,
        // so the set membership alone disambiguates the two
        const dna = new Set(['A', 'C', 'G', 'T', 'N'])
        const rna = new Set(['A', 'C', 'G', 'U', 'N'])
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
       * generates a new tree that is clustered with x,y positions
       */
      get hierarchy(): HierarchyNode<NodeWithIdsAndLength> {
        const r = this.root
        clusterLayout(r, this.totalHeight, self.treeWidth)
        const max = this.rootToTipLength
        const k = max ? self.treeWidth / max : 0
        // the displayed root starts at x=0, so subtract its length here; `root`
        // returns the cached parse, which must not be mutated
        setBrLength(r, -Math.max(r.data.length || 0, 0), k)
        // for each collapsed clade, record the pixel x-position of its farthest
        // tip so the renderer can draw a triangle spanning the branch-length
        // extent of the hidden subtree
        forEachDescendant(r, node => {
          if (node._children) {
            node.collapsedTipXFar =
              (node.len ?? 0) + collapsedSubtreeMaxLength(node) * k
          }
        })
        return r as HierarchyNode<NodeWithIdsAndLength>
      },

      /**
       * #getter
       */
      get totalHeight() {
        return leaves(this.root).length * self.rowHeight
      },

      /**
       * #getter
       */
      get leaves() {
        return leaves(this.hierarchy)
      },

      /**
       * #getter
       * branch-length extent of the displayed tree, root to farthest tip, in
       * the tree's own units
       */
      get rootToTipLength() {
        const r = this.root
        return maxLength(r) - Math.max(r.data.length || 0, 0)
      },

      /**
       * #getter
       * x-position of the farthest tip in a phylogram, px: treeWidth, or 0 for
       * a tree with no branch lengths (drawn as a cladogram)
       */
      get maxBranchLength() {
        return this.rootToTipLength ? self.treeWidth : 0
      },

      /**
       * #getter
       * pixels per unit of branch length in the phylogram layout, 0 in
       * cladogram mode. The tree's scale bar uses it.
       */
      get pxPerBranchLength() {
        const max = maxLength(this.root)
        return this.showBranchLenEffective && max ? self.treeWidth / max : 0
      },

      /**
       * #getter
       * max topological depth to a tip, used to scale cladogram x-positions
       */
      get maxDepthToLeaf() {
        return calcDepthToLeaf(this.hierarchy)
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
      /**
       * #getter
       */
      get showTreeText() {
        return self.drawLabels && self.rowHeight >= minLetterRowHeight
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get labelWidthMap() {
        const { showTreeText, leaves } = self
        // gated on the renderer's label condition, so hidden labels reserve no
        // gutter. Measured once at a reference size and scaled by
        // labelWidthScale: re-measuring per vertical-zoom frame cost ~200ms on a
        // 50k-leaf tree
        return showTreeText
          ? new Map(
              leaves.map(node => {
                const { name } = node.data
                // `||`, matching renderTreeLabels: an empty genome falls back
                // to the row name
                const displayName = self.rowDataOf(name)?.genome || name
                return [
                  name,
                  measureTextCanvas(displayName, labelReferenceFontSize),
                ] as const
              }),
            )
          : new Map<string, number>()
      },

      /**
       * #getter
       * factor turning a labelWidthMap entry into its width at the current
       * font size
       */
      get labelWidthScale() {
        return self.fontSize / labelReferenceFontSize
      },

      get labelsWidth() {
        // a loop, not Math.max(...): spreading passes one argument per leaf,
        // and the ~125k argument limit throws RangeError on the 230k-tip COVID
        // tree
        let max = 0
        for (const width of this.labelWidthMap.values()) {
          if (width > max) {
            max = width
          }
        }
        return max * this.labelWidthScale
      },

      /**
       * #getter
       */
      get secondaryStructureConsensus() {
        return self.MSA?.secondaryStructureConsensus
      },

      /**
       * #getter
       */
      get seqConsensus() {
        return self.MSA?.seqConsensus
      },

      /**
       * #getter
       * the base pairs of the consensus secondary structure, as arcs, in
       * visible column space (hidden columns are removed before parsing)
       */
      get secondaryStructureArcs(): Arc[] | undefined {
        const { blanks, hideGapsEffective } = self
        const ss = this.secondaryStructureConsensus
        if (!ss) {
          return undefined
        }
        return parseWuss(hideGapsEffective ? skipBlanks(blanks, ss) : ss).map(
          ({ start, end, pseudoknot }) => ({
            start,
            end,
            color: pseudoknot ? PSEUDOKNOT_ARC : HELIX_ARC,
          }),
        )
      },

      /**
       * #getter
       */
      get adapterTrackModels(): BasicTrack[] {
        const { MSA, hideGapsEffective, blanks } = self
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
            data: hideGapsEffective ? skipBlanks(blanks, t.data!) : t.data,
            height: rowHeight,
          },
          ReactComponent: TrackBlocks,
        }))
      },

      /**
       * #getter
       * a data track's values or string, projected from its row's residues
       * onto alignment columns when it names a row
       */
      get columnTrackContent() {
        const { MSA, blanks, hideGapsEffective } = self
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
        const skip = <T>(items: T[]) =>
          hideGapsEffective ? dropBlanks(blanks, items) : items
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
          return hideGapsEffective ? visibleColsBefore(blanks, col) : col
        }
        return new Map<
          string,
          { values?: number[]; data?: string; arcs?: Arc[] }
        >(
          self.columnTracks.map(track => {
            if (track.kind === 'arc') {
              const arcs = (track.arcs ?? [])
                .map(arc => {
                  const start = resolve(track, Math.min(arc.start, arc.end))
                  const end = resolve(track, Math.max(arc.start, arc.end))
                  return start !== undefined && end !== undefined && start < end
                    ? { start, end, color: arc.color }
                    : undefined
                })
                .filter(notEmpty)
              return [track.id, { arcs }] as const
            }
            if (track.kind === 'bar') {
              const max = track.max ?? 1
              const values = skip(project(track, track.values ?? [], 0)).map(
                v => Math.min(1, Math.max(0, v / max)),
              )
              return [track.id, { values }] as const
            }
            const data = skip(project(track, (track.data ?? '').split(''), ' '))
            return [track.id, { data: data.join('') }] as const
          }),
        )
      },
      /**
       * #method
       * the height a track draws at: what the user dragged its divider to,
       * then the height its snapshot asked for, then its kind's default. Only
       * a text track falls through to rowHeight, and `??` short-circuits
       * before reading it, so vertical zoom does not rebuild the other tracks
       */
      trackHeight(kind: TrackKind, heightKey = kind as string, given?: number) {
        return (
          self.trackHeights.get(heightKey) ??
          given ??
          defaultTrackHeights[kind] ??
          self.rowHeight
        )
      },
      /**
       * #getter
       */
      get columnTrackModels(): BasicTrack[] {
        return self.columnTracks.map(track => {
          const heightKey = resizableKinds.has(track.kind)
            ? ownHeightKey(track.id)
            : undefined
          return {
            model: {
              id: track.id,
              name: track.name,
              kind: track.kind,
              heightKey,
              height: this.trackHeight(track.kind, heightKey, track.height),
              barColor: track.color,
              arcColor: track.color,
              customColorScheme: track.colors,
              data: this.columnTrackContent.get(track.id)?.data,
              arcs: this.columnTrackContent.get(track.id)?.arcs,
            },
            ReactComponent: TrackBlocks,
          }
        })
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
                  height: this.trackHeight('arc'),
                  arcs,
                },
                ReactComponent: TrackBlocks,
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
            height: this.trackHeight(model.kind),
          },
          ReactComponent: TrackBlocks,
        }))
      },

      get tracks(): BasicTrack[] {
        return [
          ...this.adapterTrackModels,
          ...this.basePairTrackModels,
          ...this.columnTrackModels,
          ...this.computedTrackModels,
        ]
      },

      /**
       * #getter
       */
      get turnedOnTracks() {
        return this.tracks.filter(
          f =>
            !trackIsOff(self.turnedOffTracks, f.model.id, f.model.defaultOff),
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
       * Return a row-specific letter at a visible column, or undefined if gap.
       *
       * @param rowName - The name of the row
       * @param visibleCol - The visible column index (what the user sees on screen)
       * @returns The letter at that position, or undefined if it's a gap
       */
      visibleColToRowLetter(rowName: string, visibleCol: number) {
        return self.rowMap.get(rowName)?.[
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
        const { blanks, hideGapsEffective } = self
        if (!hideGapsEffective) {
          return globalCol
        }
        return globalColToVisibleCol(blanks, globalCol)
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
        const { blanks, hideGapsEffective } = self
        return hideGapsEffective
          ? visibleColToGlobalCol(blanks, visibleCol)
          : visibleCol
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
        const seq = self.rowMap.get(rowName)
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
        let endGlobal = end - 1
        if (row !== undefined) {
          const rowStart = this.seqPosToGlobalCol(row, start - 1)
          const rowEnd = this.seqPosToGlobalCol(row, end - 1)
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
          if (asymId !== undefined && mapping.structure.asymId !== asymId) {
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
       * the vertical space for alignment rows: the widget height less the
       * header, the tracks, and the minimap when columns overflow. Shared by
       * blocksY, maxScrollY, the vertical scrollbar and fitVertically.
       */
      get msaAreaHeight() {
        // the minimap, the row panel headers and the tree overview share one
        // band across the top
        return (
          self.height -
          Math.max(
            self.showHorizontalScrollbar ? self.minimapHeight : 0,
            self.rowPanelsHeaderHeight,
            self.treeOverviewHeight,
          ) -
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
        const types = new Map<string, Annotation>()
        for (const annot of self.annotations) {
          if (!types.has(annot.accession)) {
            types.set(annot.accession, annot)
          }
        }
        return types
      },
      get filteredAnnotations() {
        return self.annotations.filter(
          r => !self.turnedOffFeatures.get(r.accession),
        )
      },
      get annotationsByRow() {
        return groupBy(this.filteredAnnotations, r => r.id)
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
        return !!(self.data.msa || self.data.tree) && !self.error
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
      get blocks2d() {
        return self.blocksY.flatMap(by =>
          self.blocksX.map(bx => [bx, by] as const),
        )
      },

      /**
       * #getter
       */
      get isLoading() {
        return self.loadingMSA || self.loadingTree
      },
      /**
       * #getter
       */
      get maxScrollX() {
        return Math.min(-self.totalWidth + (self.msaAreaWidth - 100), 0)
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
       * swap in a different tree over the same alignment. Clears `collapsed`
       * and `showOnly`, since path-derived node ids (node-0-0-1) from the old
       * tree would match unrelated nodes in the new one.
       */
      replaceTree(newick: string) {
        transaction(() => {
          self.collapsed.clear()
          self.setShowOnly(undefined)
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
       */
      zoomOutHorizontal() {
        self.colWidth = Math.max(minColWidth, Math.floor(self.colWidth * 0.75))
        self.scrollX = clamp(self.scrollX, self.maxScrollX, 0)
      },
      /**
       * #action
       */
      zoomInHorizontal() {
        self.colWidth = Math.min(maxCellSize, Math.ceil(self.colWidth * 1.5))
        self.scrollX = clamp(self.scrollX, self.maxScrollX, 0)
      },
      /**
       * #action
       */
      zoomInVertical() {
        self.rowHeight = Math.min(maxCellSize, Math.ceil(self.rowHeight * 1.5))
      },
      /**
       * #action
       */
      zoomOutVertical() {
        self.rowHeight = Math.max(
          minRowHeight,
          Math.floor(self.rowHeight * 0.75),
        )
      },
      /**
       * #action
       */
      zoomIn() {
        transaction(() => {
          this.zoomInHorizontal()
          this.zoomInVertical()
        })
      },
      /**
       * #action
       */
      zoomOut() {
        transaction(() => {
          this.zoomOutHorizontal()
          this.zoomOutVertical()
        })
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
          if (axis !== 'vertical') {
            self.colWidth = clamp(
              self.colWidth * scaleFactor,
              minColWidth,
              maxCellSize,
            )
          }
          if (axis !== 'horizontal') {
            self.rowHeight = clamp(
              self.rowHeight * scaleFactor,
              minRowHeight,
              maxCellSize,
            )
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
       * set the overlay from raw InterProScan results keyed by row name. Kept
       * for downstream plugins that hold the EBI wire format; new code should
       * adapt to Annotation[] and call setAnnotations.
       */
      setDomains(data?: Record<string, InterProScanResults>) {
        this.setAnnotations(data ? interProScanToAnnotations(data) : [])
      },

      applyGFFText(gffText: string) {
        this.setAnnotations(gffToAnnotations(parseGFF(gffText)))
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
      setRowData(rowData: Record<string, Record<string, string>>) {
        self.data.setTreeMetadata(JSON.stringify(rowData))
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
       * replace the alignment<->structure correspondence (see docs/layers.md)
       */
      setResidueMappings(mappings: ResidueMapping[]) {
        self.residueMappings.replace(mappings)
      },
      /**
       * #action
       */
      toggleTrack(id: string) {
        const defaultOff = self.MSA?.tracks.find(t => t.id === id)?.defaultOff
        self.turnedOffTracks.set(
          id,
          !trackIsOff(self.turnedOffTracks, id, defaultOff),
        )
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
       * #method
       * the cell at a visible column and row index, in the coordinates a host
       * writes highlights in
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
              letter: self.rowMap.get(row)?.[column],
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
          blockWidth: this.msaCanvasWidth,
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
       * categorical feature types (InterPro domains and the like) that each get
       * their own color and a legend entry
       */
      get categoricalDomainTypes() {
        return [...self.annotationTypes.values()].filter(
          d => !segmentFeatureTypes.has(d.featureType ?? ''),
        )
      },
      get fillPalette() {
        const segments = Object.fromEntries(
          this.segmentDomainTypes.map((d, i) => [
            d.accession,
            segmentShades[i % segmentShades.length]!,
          ]),
        )
        const categorical = createPaletteMap(
          this.categoricalDomainTypes.map(d => d.accession),
        )
        return { ...segments, ...categorical }
      },
      get strokePalette() {
        return transform(this.fillPalette, ([key, val]) => [
          key,
          outlineColor(val),
        ])
      },

      /**
       * #getter
       * the encoding coloring the overlay's spans, undefined when none does,
       * which leaves each span the color its accession takes in `fillPalette`
       */
      get featureFillEncoding(): ResolvedEncoding | undefined {
        return this.resolvedEncodings.find(e => e.channel === 'featureFill')
      },

      /**
       * #getter
       * the fill and outline of every feature's span: its own GFF `color=`
       * first, then the `featureFill` scale, then the accession palette.
       * Computed once per change of the features, the encodings or the palette
       */
      get featureColors(): Map<Annotation, { fill: string; stroke: string }> {
        const { featureFillEncoding, fillPalette } = this
        const strokes = new Map<string, string>()
        const strokeOf = (fill: string) => {
          const hit = strokes.get(fill)
          if (hit !== undefined) {
            return hit
          }
          const stroke = outlineColor(fill)
          strokes.set(fill, stroke)
          return stroke
        }
        const scaleColorOf = (annotation: Annotation) => {
          const value = featureFillEncoding
            ? featureField(annotation, featureFillEncoding.field)
            : undefined
          return value === undefined
            ? undefined
            : featureFillEncoding!.colorOf(value)
        }
        return new Map(
          self.filteredAnnotations.map(annotation => {
            const fill =
              annotation.color ??
              scaleColorOf(annotation) ??
              fillPalette[annotation.accession]!
            return [annotation, { fill, stroke: strokeOf(fill) }]
          }),
        )
      },

      /**
       * #getter
       * the text the `featureLabel` channel draws inside each span, undefined
       * when no encoding names the channel. A data channel, so it draws
       * whether or not the residue letters do
       */
      get featureLabels(): Map<Annotation, string> | undefined {
        const encoding = this.resolvedEncodings.find(
          e => e.channel === 'featureLabel',
        )
        if (!encoding) {
          return undefined
        }
        const labels = new Map<Annotation, string>()
        for (const annotation of self.filteredAnnotations) {
          const value = featureField(annotation, encoding.field)
          if (value !== undefined) {
            labels.set(annotation, value)
          }
        }
        return labels
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
          .filter(d => !self.turnedOffFeatures.get(d.accession))
          .toSorted((a, b) => a.start - b.start)
      },

      /**
       * #getter
       * the categorical color keys drawn for this view, shared by the on-screen
       * legend overlay and the SVG export's reserved column. The domain overlay
       * produces the first, listing the `featureFill` scale where an encoding
       * names one. Every field a row-table encoding or a row panel reads
       * produces one more, so two channels over one field, or two strips over
       * it, list that field once
       */
      get legends(): Legend[] {
        const { featureFillEncoding, fillPalette, visibleDomainTypes } = this
        const entries = featureFillEncoding
          ? featureFillEncoding.legend
          : visibleDomainTypes.map(d => ({
              id: d.accession,
              label: d.name,
              color: fillPalette[d.accession]!,
            }))
        const domainLegends =
          self.actuallyShowDomains && entries.length > 0
            ? [
                {
                  id: 'domains',
                  title: featureFillEncoding?.field ?? 'Domains',
                  entries,
                },
              ]
            : []
        const byField = new Map<string, Legend>()
        const addField = (field: string, entries: LegendEntry[]) => {
          if (entries.length === 0) {
            return
          }
          const legend = byField.get(field)
          if (legend) {
            const seen = new Set(legend.entries.map(e => e.id))
            legend.entries.push(...entries.filter(e => !seen.has(e.id)))
          } else {
            byField.set(field, {
              id: `rowData-${field}`,
              title: field,
              entries: [...entries],
            })
          }
        }
        for (const { channel, field, legend } of this.resolvedEncodings) {
          if (!featureChannels.has(channel)) {
            addField(field, legend)
          }
        }
        for (const { field, legend } of this.resolvedRowPanels) {
          addField(field, legend)
        }
        return [...domainLegends, ...byField.values()]
      },

      /**
       * #getter
       * whether the overlay marks each domain with a bar under its row instead
       * of filling the row behind the letters. Letter-color mode hands the
       * background to the color scheme, so a filled box would paint over it and
       * leave the setting with nothing to show. Sub-row layout already stacks
       * the boxes clear of the letters, and with the letters too small to draw
       * the filled box is the only thing left to read.
       */
      get domainUnderline() {
        return (
          self.actuallyShowDomains &&
          !self.bgColor &&
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
              const end = self.seqPosToGlobalCol(name, annotation.end - 1)
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
        const { highlightedColumns } = self
        const runs: { start: number; end: number }[] = []
        for (const col of [...(highlightedColumns ?? [])].sort(
          (a, b) => a - b,
        )) {
          const last = runs.at(-1)
          if (last && col === last.end + 1) {
            last.end = col
          } else {
            runs.push({ start: col, end: col })
          }
        }
        return runs
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
          ...self.highlights,
          ...Object.values(transientHighlights).flat(),
        ]
        return all.flatMap(({ row, rows, start, end, label, color }) => {
          const base = { label, color }
          if (rows) {
            const rowIndices = rows
              .map(name => rowNamesSet.get(name))
              .filter(notEmpty)
            return rowIndices.length ? [{ ...base, rowIndices }] : []
          }
          if (start === undefined || end === undefined) {
            return []
          }
          const span = self.visibleSpan({ row, start, end })
          return span ? [{ ...base, ...span, rowIndices: [] }] : []
        })
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
       * #getter
       * `columnStatsAt` for the hovered column, undefined when nothing is
       * hovered
       */
      get mouseOverColumnStats(): ColumnStats | undefined {
        const { mouseCol, colStats, conservation, propertyConservation } = self
        return mouseCol === undefined
          ? undefined
          : columnStats({
              col: mouseCol,
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
       * takes: a feature channel reads them across the features drawn, every
       * other channel across the row table. Resolved once per change of that
       * table or the encodings, never per row per frame.
       */
      get resolvedEncodings(): ResolvedEncoding[] {
        const rows = Object.values(self.rowData)
        const features = self.filteredAnnotations
        return self.encodings.map(encoding => ({
          ...encoding,
          ...resolveScale(
            encoding.scale,
            featureChannels.has(encoding.channel)
              ? features
                  .map(a => featureField(a, encoding.field))
                  .filter(notEmpty)
              : rows.map(row => row?.[encoding.field]).filter(notEmpty),
          ),
        }))
      },

      /**
       * #getter
       * each row panel with its scale resolved against the values its field
       * takes across the row table, giving the color per row name, the pixel
       * column it draws in, and the entries its legend lists. Resolved once
       * per change of that table or the panels, never per block per frame.
       */
      get resolvedRowPanels(): ResolvedRowPanel[] {
        const rows = Object.entries(self.rowData)
        let offsetX = 0
        return self.rowPanels.map((panel, index) => {
          const { colorOf, legend } = resolveScale(
            panel.scale,
            rows.map(([, row]) => row?.[panel.field]).filter(notEmpty),
          )
          const colors = new Map<string, string>()
          for (const [name, row] of rows) {
            const value = row?.[panel.field]
            const color = value === undefined ? undefined : colorOf(value)
            if (color) {
              colors.set(name, color)
            }
          }
          const width = rowPanelWidth(panel, self.rowHeight)
          const resolved = {
            id: `rowpanel-${index}`,
            kind: panel.kind,
            field: panel.field,
            header: panel.header ?? panel.field,
            width,
            offsetX,
            colors,
            legend,
          }
          offsetX += width
          return resolved
        })
      },

      /**
       * #getter
       * the color the `tipLabel` channel gives each row, by row name. Undefined
       * when no encoding names the channel, which leaves the labels the theme's
       * text color.
       */
      get tipLabelColors(): Map<string, string> | undefined {
        const encoding = this.resolvedEncodings.find(
          e => e.channel === 'tipLabel',
        )
        if (!encoding) {
          return undefined
        }
        const colors = new Map<string, string>()
        for (const [name, row] of Object.entries(self.rowData)) {
          const value = row?.[encoding.field]
          const color =
            value === undefined ? undefined : encoding.colorOf(value)
          if (color) {
            colors.set(name, color)
          }
        }
        return colors
      },

      /**
       * #getter
       * the wash the `rowTint` channel draws over each row, indexed by row, or
       * undefined when no encoding names the channel. The overlay draws these,
       * so a tint stays out of the raster tile cache and its keys.
       */
      get rowTints(): (string | undefined)[] | undefined {
        const encoding = this.resolvedEncodings.find(
          e => e.channel === 'rowTint',
        )
        if (!encoding) {
          return undefined
        }
        return self.rowNames.map(name => {
          const value = self.rowDataOf(name)?.[encoding.field]
          const color =
            value === undefined ? undefined : encoding.colorOf(value)
          if (!color) {
            return undefined
          }
          return withAlpha(color, rowTintAlpha)
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
        const encoding = this.resolvedEncodings.find(
          e => e.channel === 'branch',
        )
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
        self.clearWarnings()
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
      },
      /**
       * #action
       */
      async exportSVG(opts: ExportSvgOptions) {
        const { renderToSvg } = await import('./renderToSvg.tsx')
        const html = await renderToSvg(self as MsaViewModel, opts)
        const blob = new Blob([html], { type: 'image/svg+xml' })
        saveAs(blob, exportFileName(self.msaFilehandle, 'svg'))
      },
      /**
       * #action
       * show or hide an annotation type. Only hidden types are recorded; see
       * `turnedOffFeatures`
       */
      setFilter(accession: string, shown: boolean) {
        if (shown) {
          self.turnedOffFeatures.delete(accession)
        } else {
          self.turnedOffFeatures.set(accession, true)
        }
      },

      /**
       * #action
       */
      fit() {
        // two passes: each direction's viewport depends on whether the other
        // overflows (the minimap takes height, the vertical scrollbar width)
        transaction(() => {
          for (let pass = 0; pass < 2; pass++) {
            this.fitHorizontally()
            this.fitVertically()
          }
        })
      },
      /**
       * #action
       */
      fitVertically() {
        if (self.numRows > 0) {
          self.rowHeight = clamp(
            self.msaAreaHeight / self.numRows,
            minRowHeight,
            maxCellSize,
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
          self.colWidth = clamp(
            self.msaCanvasWidth / (span.endCol - span.startCol + 1),
            minColWidth,
            maxCellSize,
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
       */
      fitHorizontally() {
        if (self.numColumns > 0) {
          // msaCanvasWidth excludes the vertical scrollbar's 20px
          self.colWidth = clamp(
            self.msaCanvasWidth / self.numColumns,
            minColWidth,
            maxCellSize,
          )
        }
        self.scrollX = 0
      },

      afterCreate() {
        if (self.highlightColumns?.length) {
          self.setHighlightedColumns(self.highlightColumns)
        }

        // The `collapse` and `focus` clade marks seed the collapsed list and
        // the subtree in focus, which the tree, `hideGapsEffective` and the
        // alignment all read. The tree arrives with the model for inline data
        // and later for a filehandle, so the seeding waits for it and then runs
        // once: expanding a seeded clade sticks, and the record collapses it
        // again only on reload.
        let cladesSeeded = false
        addDisposer(
          self,
          autorun(() => {
            if (
              cladesSeeded ||
              !self.dataInitialized ||
              self.clades.length === 0
            ) {
              return
            }
            cladesSeeded = true
            for (const { mark, nodeId } of self.resolvedClades) {
              if (nodeId === undefined) {
                continue
              }
              if (mark === 'collapse' && !self.collapsed.includes(nodeId)) {
                self.toggleCollapsed(nodeId)
              } else if (mark === 'focus') {
                self.setShowOnly(nodeId)
              }
            }
          }),
        )

        // the matchMedia query is pinned to the current device pixel ratio, so
        // each change re-registers against the new one
        if (
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function'
        ) {
          const query = () =>
            window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
          let mql = query()
          const onChange = () => {
            self.setHighResScaleFactor(window.devicePixelRatio)
            mql.removeEventListener('change', onChange)
            mql = query()
            mql.addEventListener('change', onChange)
          }
          mql.addEventListener('change', onChange)
          addDisposer(self, () => {
            mql.removeEventListener('change', onChange)
          })
        }

        /**
         * Fetch a filehandle whenever it changes, and hand the text to
         * `onLoad`.
         *
         * A generation guard keeps a slower superseded request from overwriting
         * the newer one's data, status or loading flag. A superseded or cleared
         * request is aborted and clears its status line.
         *
         * `clearFilehandle` runs after a local file loads, since a blob has no
         * URL to refetch, and when the user cancels, which returns the view to
         * the import form.
         *
         * `what` names the layer in a failure message. An `optional` layer
         * (annotations, row metadata) that fails adds a warning instead of an
         * error.
         */
        const loadOnFilehandleChange = ({
          what,
          getFilehandle,
          onLoad,
          setLoading,
          clearFilehandle,
          optional = false,
        }: {
          what: string
          getFilehandle: () => FileLocationType | undefined
          onLoad: (text: string) => void
          setLoading?: (arg: boolean) => void
          clearFilehandle?: () => void
          optional?: boolean
        }) => {
          let generation = 0
          let cancelInFlight: (() => void) | undefined
          addDisposer(self, () => {
            cancelInFlight?.()
          })
          addDisposer(
            self,
            autorun(async () => {
              const filehandle = getFilehandle()
              const current = ++generation
              cancelInFlight?.()
              cancelInFlight = undefined
              if (!filehandle) {
                setLoading?.(false)
                return
              }
              const isCurrent = () => current === generation && isAlive(self)
              const controller = new AbortController()
              cancelInFlight = () => {
                controller.abort()
                if (isAlive(self)) {
                  self.setStatus(undefined)
                }
              }
              try {
                setLoading?.(true)
                self.setError(undefined)
                const text = await fetchTextWithProgress(
                  openLocation(filehandle),
                  status => {
                    if (isCurrent()) {
                      self.setStatus(status)
                    }
                  },
                  { controller },
                )
                if (isCurrent()) {
                  transaction(() => {
                    onLoad(text)
                    if (filehandle.locationType === 'BlobLocation') {
                      clearFilehandle?.()
                    }
                  })
                }
              } catch (e) {
                if (isCurrent()) {
                  if (isAbortError(e)) {
                    clearFilehandle?.()
                  } else {
                    console.error(e)
                    if (optional) {
                      self.addWarning(`The ${what} did not load: ${e}`)
                    } else {
                      self.setError(e)
                    }
                  }
                }
              } finally {
                if (isCurrent()) {
                  cancelInFlight = undefined
                  setLoading?.(false)
                }
              }
            }),
          )
        }

        loadOnFilehandleChange({
          what: 'tree',
          getFilehandle: () => self.treeFilehandle,
          onLoad: text => {
            self.setTree(text)
          },
          setLoading: arg => {
            self.setLoadingTree(arg)
          },
          clearFilehandle: () => {
            self.setTreeFilehandle(undefined)
          },
        })

        // treeMetadata has no import-form step, so no loading flag or cancel
        loadOnFilehandleChange({
          what: 'row metadata',
          optional: true,
          getFilehandle: () => self.treeMetadataFilehandle,
          onLoad: text => {
            self.setTreeMetadata(text)
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
                self.addWarning(`The annotations did not parse: ${e}`)
              }
            } else if (appliedGFF) {
              appliedGFF = false
              self.setAnnotations([])
            }
          }),
        )

        // gffFilehandle loads into data.gff, which the autorun above parses
        loadOnFilehandleChange({
          what: 'annotations',
          optional: true,
          getFilehandle: () => self.gffFilehandle,
          onLoad: text => {
            self.setGFF(text)
          },
          clearFilehandle: () => {
            self.setGFFFilehandle(undefined)
          },
        })

        loadOnFilehandleChange({
          what: 'alignment',
          getFilehandle: () => self.msaFilehandle,
          onLoad: text => {
            self.setMSA(text)
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
            if (self.colorSchemeName.includes('dynamic')) {
              // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
              self.colStats
            }
            if (self.showColumnStats) {
              // everything the hover tooltip reads per column
              // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
              self.colStats
              // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
              self.conservation
              // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
              self.propertyConservation
            }
            // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
            self.columns
          }),
        )

        // with autoTreeAreaWidth and no tree drawn, size the tree area to the
        // labels. Gated on noTree/!drawTree so it does not loop with the
        // treeWidth autorun below
        addDisposer(
          self,
          autorun(() => {
            if (
              self.autoTreeAreaWidth &&
              (self.noTree || !self.drawTree) &&
              self.labelsWidth
            ) {
              self.setTreeAreaWidth(
                self.labelsWidth + self.marginLeft + 12 + self.cladeGutterWidth,
              )
            }
          }),
        )

        // treeWidth follows the tree area less the labels. A non-default
        // snapshot treeWidth (jbrowse-plugin-msaview opens at 100 in a 200px
        // area) is kept until the tree area changes. Not a getter, because
        // labelsWidth is measured off leaves laid out against treeWidth.
        let pinnedAreaWidth =
          self.treeWidth === defaultTreeWidth ? undefined : self.treeAreaWidth
        addDisposer(
          self,
          autorun(() => {
            const areaWidth = self.treeAreaWidth
            const labelsWidth = self.labelsWidth
            if (pinnedAreaWidth === areaWidth) {
              return
            }
            pinnedAreaWidth = undefined
            self.setTreeWidth(
              Math.max(
                50,
                areaWidth -
                  labelsWidth -
                  10 -
                  self.marginLeft -
                  self.cladeGutterWidth,
              ),
            )
          }),
        )
      },
    }))
    .postProcessSnapshot(({ data, columnTracks, ...rest }) => ({
      // stripDefault handles per-property defaults; this drops inline documents
      // whose filehandle can refetch them
      ...rest,
      ...smallColumnTracks(columnTracks),
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

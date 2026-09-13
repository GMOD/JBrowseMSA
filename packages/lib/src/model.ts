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
import { colord } from 'colord'
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
import TrackBlocks from './components/tracks/TrackBlocks.tsx'
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
  leaves,
  maxLength,
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
import { buildSeqPosIndex } from './seqPosToGlobalCol.ts'
import { maxBitsFor } from './sequenceLogo.ts'
import { stripDefault } from './stripDefault.ts'
import {
  computeRowInsertions,
  dropBlanks,
  len,
  skipBlanks,
  transform,
} from './util.ts'
import { saveAs } from './vendor/fileSaver.ts'
import { parseWuss } from './wuss.ts'

import type { HierarchyNode } from './hierarchy.ts'
import type { ExportSvgOptions } from './renderToSvg.tsx'
import type {
  Annotation,
  Arc,
  BasicTrack,
  ResidueMappingProblem,
  ColumnTrackSpec,
  DomainBand,
  Highlight,
  NodeWithIds,
  NodeWithIdsAndLength,
  ResidueMapping,
  ResidueSegment,
  ResolvedHighlight,
  RowResidue,
  StructureResidue,
  UnshareableData,
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

// Tracks that start hidden. The sequence logo answers a narrower question than
// conservation does and costs three times the vertical space, so it waits to be
// asked for.
const defaultOffTracks = new Set(['sequence-logo'])

// base-pair arcs: one color for the nested helices, one for a pseudoknot, whose
// whole point is that it crosses them
const HELIX_ARC = '#4e79a7'
const PSEUDOKNOT_ARC = '#e15759'

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
 * reset() applies a default snapshot filtered to this list, so the list is the
 * whole decision: a property left off it resets to its default, a visible and
 * benign failure. The previous shape — a hand-maintained list of things to
 * CLEAR — failed in the dangerous direction: a forgotten property silently
 * carried the previous file's state into the next one, and because node ids
 * are path-derived (node-0-0-1), a stale `collapsed` or `showOnly` id matched
 * a real node in the new tree and folded it. Downstream composed properties
 * (e.g. the jbrowse plugin's) are not on the list, so they reset too.
 *
 * Exported for modelReset.test.ts, which checks that everything off this list
 * matches a freshly created model after reset().
 */
export const preservedOnReset = new Set([
  'id',
  'type',
  'height',
  'drawMsaLetters',
  'scrollZoom',
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
  'autoTreeAreaWidth',
  'turnedOffTracks',
  'hideGaps',
  'allowedGappyness',
  'subFeatureRows',
  'showDomainLegend',
])

// `turnedOffTracks` records the user's explicit choices only: an id is absent
// until they touch that track, and then its value is whether the track is OFF.
// Reading the default through this is what lets a track ship hidden without
// writing an entry into every snapshot and shared URL.
// A track the file itself supplies says whether it starts hidden, since only
// the file knows how many of them there are: a Pfam seed carries a couple of
// #=GR lines, an Rfam family one per row.
function trackIsOff(
  turnedOffTracks: { get: (id: string) => boolean | undefined },
  id: string,
  defaultOff?: boolean,
) {
  return turnedOffTracks.get(id) ?? (defaultOff || defaultOffTracks.has(id))
}

// one array for every "nothing under the pointer", since a fresh [] is a fresh
// value to every observer of it
const noDomains: Annotation[] = []

// seqPos -> column indexes, per row, hung off the parse the rows came from so
// they are collected with it. A computed would rebuild every row's index on
// each miss, and rebuild all of them again whenever it was read outside a
// reactive context.
const seqPosIndexCache = new WeakMap<object, Map<string, Int32Array>>()

// A segment asserts a 1:1 run, so its two sides have to be the same length.
// One that is not is malformed data, and the arithmetic below would answer
// anyway -- with a residue that is off by however much the sides disagree. Skip
// it, the same refusal an uncovered position gets.
function sameLength(segment: ResidueSegment) {
  return (
    segment.rowEnd - segment.rowStart ===
    segment.structEnd - segment.structStart
  )
}

// Does the content need a scrollbar? fit() divides the viewport by the row or
// column count and multiplies it back, so an exact fit lands a fraction of a
// pixel over -- enough for a `>` to answer yes and hand the reader a minimap or
// a scrollbar for half a pixel of nothing, which then shrinks the viewport and
// leaves a gap.
function overflows(content: number, viewport: number) {
  return content - viewport > 0.5
}

function inRanges(ranges: [number, number][] | undefined, position: number) {
  return !!ranges?.some(([start, end]) => position >= start && position <= end)
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
         * top-right of the alignment, so on a tall panel it covers real
         * residues -- persisting the state is what lets a reader collapse it
         * and keep it collapsed, and what lets a session or a figure open with
         * it already out of the way.
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
         * tracks supplied as data rather than computed from the alignment:
         * per-column values drawn as bars, or a per-column string drawn as a
         * text track. See docs/layers.md
         */
        columnTracks: stripDefault(
          types.array(types.frozen<ColumnTrackSpec>()),
          [],
        ),

        /**
         * #property
         * which residue of which structure each row's residues are, as data.
         * The viewer cannot infer this -- matching a row to a structure by
         * sequence equality fails for a tagged construct, a truncation or a
         * subsequence row, and fails in the direction that looks like it
         * worked -- so it arrives computed. See docs/layers.md
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
         * accession with the value meaning "off", the same shape as
         * `turnedOffTracks`. An accession the user has never touched is absent
         * and drawn, so a file of two hundred domain types adds nothing to the
         * shared URL until someone filters one out
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
         * Persists in the snapshot, so a computed answer travels in the URL.
         */
        highlights: stripDefault(types.array(types.frozen<Highlight>()), []),
      }),
    )
    .volatile(() => ({
      /**
       * #volatile
       */
      headerHeight: 0,
      /**
       * #volatile
       */
      status: undefined as { msg: string; onCancel?: () => void } | undefined,
      /**
       * #volatile
       * high resolution scale factor, helps make canvas look better on hi-dpi
       * screens. derived from the device pixel ratio so canvases are crisp on
       * retina/4k displays and not needlessly oversized on standard ones
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
       * transient highlights keyed by who asked for them. One slot cannot hold
       * two sources -- a structure viewer's hover and a genome view's hover
       * both want to point at a column, and with one slot whoever clears last
       * erases the other's. Keyed by owner, each source adds and removes only
       * its own. Not persisted: a hover is not part of the document.
       */
      transientHighlights: {} as Record<string, Highlight[]>,

      /**
       * #volatile
       */
      minimapHeight: 56,

      /**
       * #volatile
       */
      conservationTrackHeight: 40,

      /**
       * #volatile
       * heights of individual `columnTracks`, by track id. A data track is
       * resized on its own: the shared per-kind heights below belong to the
       * tracks the viewer computes, and dragging a data track's handle used to
       * resize those instead.
       */
      columnTrackHeights: {} as Record<string, number>,

      /**
       * #volatile
       * taller than the conservation track by default: the logo spends its
       * height on stacked glyphs, and a 40px stack of four residues leaves each
       * one too short to identify
       */
      sequenceLogoTrackHeight: 80,

      /**
       * #volatile
       */
      arcTrackHeight: 50,

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
       * load problems the view carried on through: an optional layer that did
       * not arrive, an overlay that did not parse. `error` is the other kind --
       * it replaces the view, which is right for the alignment and wrong for a
       * decorative file
       */
      warnings: [] as string[],

      /**
       * #volatile
       * bumped by reset(). The React error boundary above the view keeps its
       * caught error until it is remounted, so "Return to import form" did
       * nothing after a render error until this became its key
       */
      resetCount: 0,

      /**
       * #volatile
       * set by a host that restores the loaded documents by its own means --
       * a jbrowse session that holds them, a page that refetches them on load.
       * `unshareableData` then reports nothing, since what it warns about is a
       * link that opens empty, and under such a host the link does not
       */
      hostCarriesData: false,

      /**
       * #volatile
       * overlay annotations drawn on the alignment, whatever their source.
       * Every source -- InterProScan, GFF, a user upload -- converts to this
       * flat list before it reaches the model, so nothing downstream of here
       * knows which one it came from
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
       * high-res scale factor, tracks the device pixel ratio so canvases stay
       * crisp when the window moves between monitors or the browser zooms
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
       * report something the view survived: a layer that failed to load, a
       * file that failed to parse
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
       * takes down the "Not in the link" warning. See `hostCarriesData`
       */
      setHostCarriesData(arg: boolean) {
        self.hostCarriesData = arg
      },

      /**
       * #action
       * set mouse position (row, column) in the MSA
       *
       * PUBLIC API: a host drives this (and reads the `mouseCol` volatile) to
       * sync the alignment's hover with a view of its own -- a genome view, a
       * 3D structure. Keep the name and signature stable.
       */
      setMousePos(col?: number, row?: number) {
        self.mouseCol = col
        self.mouseRow = row
      },

      /**
       * #action
       * set highlighted columns
       *
       * PUBLIC API: jbrowse-plugin-msaview calls this from its
       * afterCreateAutoruns to highlight alignment columns, and MSAViewer
       * passes its `highlightColumns` prop through it. Not dead code.
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
       * show `highlights` on behalf of `owner`, replacing whatever that owner
       * showed before and leaving every other owner's alone. The object is
       * replaced rather than mutated so one assignment is the observable
       * change.
       */
      applyHighlight(owner: string, highlights: Highlight[]) {
        self.transientHighlights = {
          ...self.transientHighlights,
          [owner]: highlights,
        }
      },
      /**
       * #action
       * drop what `owner` was showing, leaving every other owner's in place
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
       * switch to another alignment of a multi-alignment file (Stockholm). The
       * new alignment has its own rows and its own tree, so everything naming
       * the old one's -- the collapsed node ids, the subtree in focus, the
       * reference row, the scroll position -- goes with it
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
       * keep the GFF text the way the alignment and the tree are kept, rather
       * than only its parsed annotations. The annotations are volatile, so a
       * file opened from disk used to leave no trace in the snapshot at all --
       * not the text, and not the filehandle, which is cleared once a blob is
       * read. An autorun parses this back into annotations.
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
       * whether this host brings the loaded documents back by means the
       * snapshot cannot see, which is what decides whether `unshareableData`
       * has anything to warn about.
       *
       * A simple host flips the `hostCarriesData` volatile. A host whose
       * answer depends on how the view was opened overrides this getter in a
       * `.views` block of its own composed model -- jbrowse-plugin-msaview's
       * indexed-location views refetch from a URL the session holds, while its
       * data-store views really are absent from a link someone pastes
       * elsewhere. `unshareableData` reads it off `self`, so an override wins.
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
        // colorSchemeName is a free string (menus, snapshots, URL params); fall
        // back to the default rather than returning undefined on a stale name
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
       * the loaded documents this view's own snapshot cannot carry, largest
       * first. A file opened from disk or pasted in becomes inline text, and
       * DataModel drops an inline document past `maxInlineSnapshotBytes`
       * rather than put megabytes of sequence into a session or a URL.
       *
       * Dropping it is right. Dropping it silently is what makes a copied link
       * open an empty viewer, so the header says so and the standalone app
       * stops rewriting the address bar while this is non-empty. A document
       * fetched from a URL never appears here whatever its size: the snapshot
       * keeps the filehandle and refetches through it.
       *
       * Nothing is unshareable when the host restores the data by its own
       * means (see `hostRestoresData`) -- inside a session that reloads these
       * documents from somewhere the snapshot does not show, the warning is
       * simply wrong.
       */
      get unshareableData(): UnshareableData[] {
        if (self.hostRestoresData) {
          return []
        }
        const { data } = self
        // a data track past the limit leaves the snapshot the same way an
        // inline document does, and left unreported the same way too
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
       * extra per-row attributes, keyed by row name. Parsed defensively: the
       * source is a user-supplied document (treeMetadataFilehandle, or a
       * session snapshot), and this computed is read by labelWidthMap on every
       * layout, so a malformed file would otherwise throw out of rendering and
       * take the whole view down over a decorative field.
       */
      get treeMetadata(): Record<string, Record<string, string> | undefined> {
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
          console.error('failed to parse treeMetadata', e)
          return {}
        }
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
        let hier = hierarchy(this.tree, d => d.children)
        hierarchySum(hier, d => (d.children.length > 0 ? 0 : 1))
        sort(hier, (a, b) => (a.data.length ?? 1) - (b.data.length ?? 1))

        if (self.showOnly) {
          const res = find(hier, n => n.data.id === self.showOnly)
          if (res) {
            hier = res
          }
        }

        for (const collapsedId of self.collapsed) {
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
      },

      /**
       * #getter
       * widget width minus the tree area gives the space for the MSA
       */
      get msaAreaWidth() {
        return self.width - self.treeAreaWidth - self.resizeHandleWidth
      },

      /**
       * #getter
       */
      get treeAreaWidthMinusMargin() {
        return self.treeAreaWidth - self.marginLeft
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
       * number of rows the alignment occupies on screen. This is the leaf count,
       * not `rows.length`: a tree leaf with no matching MSA row still takes up a
       * row of vertical space (drawn blank), so row hit-testing and fit-to-height
       * must count it.
       */
      get numRows() {
        return this.leaves.length
      },

      /**
       * #method
       * index of the global column holding each ungapped sequence position of a
       * row, so seqPos -> column is a lookup rather than a scan. The domain
       * overlay resolves thousands of these per redraw.
       *
       * Built per row, on the row asked for: the first lookup used to index
       * every row in the alignment. The cache is keyed on the parse the rows
       * came from, so a new alignment brings a new one.
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
       * every sequence the alignment holds, keyed by row name, whatever the
       * tree currently shows. `rows` is the rows on screen; this is the rows
       * that exist, and every lookup about a named row goes through it --
       * collapsing a clade hides rows, it does not delete their sequence
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
        // the displayed root starts at x=0 whatever branch length it carries,
        // so its own length is subtracted here rather than zeroed on the parsed
        // node -- `root` hands out the cached parse, and writing to it made
        // showOnly shorten that branch for good
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
       * x-position of the farthest tip in a phylogram, px. The layout scales
       * the longest root-to-tip path onto treeWidth, so that is where it lands
       * -- and 0 for a tree carrying no lengths at all, which draws as a
       * cladogram instead
       */
      get maxBranchLength() {
        return this.rootToTipLength ? self.treeWidth : 0
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
        const { showTreeText, leaves, treeMetadata } = self
        // gated on the same condition the renderer draws labels under, so the
        // gutter labelsWidth reserves and the labels actually drawn cannot
        // disagree -- and so turning labels off hands their space to the tree.
        // Measured at a fixed reference size and scaled by labelWidthScale:
        // re-measuring every leaf on every vertical-zoom frame cost ~200ms on a
        // 50k-leaf tree
        return showTreeText
          ? new Map(
              leaves.map(node => {
                const { name } = node.data
                // `||`, matching renderTreeLabels: an empty genome falls back
                // to the row name, and measuring '' would size the gutter (and
                // the label's click target) to nothing
                const displayName = treeMetadata[name]?.genome || name
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
        // a loop, not Math.max(...widths.values()): spreading a map of every
        // leaf passes one argument per row, and the argument limit is somewhere
        // around 125k -- so the bundled 230k-tip COVID tree threw
        // "RangeError: Maximum call stack size exceeded" out of a getter the
        // treeWidth autorun reads on load
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
       * the base pairs of the consensus secondary structure, as arcs. The WUSS
       * string is collapsed through the hidden columns before it is parsed, so
       * the pairs land in the same visible column space the text track does
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
          // reading rowHeight up front made every zoom frame rebuild the track
          // list, and the canvases redraw on the track object they are handed
          // changing
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
        // an arc names two positions rather than one per column, so it takes
        // the same two steps the arrays take -- a row's residues onto columns,
        // then columns onto the visible ones -- as a lookup. visibleColsBefore,
        // not globalColToVisibleCol: an endpoint in a hidden column collapses
        // to where that column went instead of taking the whole arc with it
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
       * #getter
       */
      get columnTrackModels(): BasicTrack[] {
        // read per kind, not up front: a text track is the only kind sized by
        // the row height, and reading it here rebuilt every data track on every
        // vertical zoom step
        const defaultHeight = (kind: ColumnTrackSpec['kind']) =>
          kind === 'bar'
            ? self.conservationTrackHeight
            : kind === 'arc'
              ? self.arcTrackHeight
              : self.rowHeight
        return self.columnTracks.map(track => ({
          model: {
            id: track.id,
            name: track.name,
            kind: track.kind,
            height:
              self.columnTrackHeights[track.id] ??
              track.height ??
              defaultHeight(track.kind),
            // the spec has one `color`; bar and arc are separate track models
            // that read it under their own name
            barColor: track.color,
            arcColor: track.color,
            customColorScheme: track.colors,
            data: this.columnTrackContent.get(track.id)?.data,
            arcs: this.columnTrackContent.get(track.id)?.arcs,
          },
          ReactComponent: TrackBlocks,
        }))
      },
      /**
       * #getter
       */
      /**
       * #getter
       * the consensus secondary structure as a track, when there is one. Its
       * own getter so the object keeps its identity across a zoom: the canvas
       * redraws on the track it is handed changing, and rebuilding these
       * alongside everything else made every zoom frame redraw every track
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
                  height: self.arcTrackHeight,
                  arcs,
                },
                ReactComponent: TrackBlocks,
              },
            ]
          : []
      },

      /**
       * #getter
       * the tracks computed from the alignment itself, which depend on their
       * own heights and on the alphabet -- and on nothing zoom changes
       */
      get computedTrackModels(): BasicTrack[] {
        return [
          {
            id: 'conservation',
            name: 'Conservation',
            kind: 'bar' as const,
            height: self.conservationTrackHeight,
            barColor: 'gray',
          },
          ...(self.sequenceType === 'amino'
            ? [
                {
                  id: 'property-conservation',
                  name: 'Property conservation',
                  kind: 'bar' as const,
                  height: self.conservationTrackHeight,
                  barColor: '#6a51a3',
                },
              ]
            : []),
          {
            id: 'sequence-logo',
            name: 'Sequence logo',
            kind: 'logo' as const,
            height: self.sequenceLogoTrackHeight,
          },
        ].map(model => ({ model, ReactComponent: TrackBlocks }))
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
       * PUBLIC API: this and the sibling coordinate converters
       * (visibleColToGlobalCol, seqPosToVisibleCol, globalColToVisibleCol,
       * seqPosToGlobalCol) are how a host translates between alignment columns
       * and a row's residue positions across gaps. Keep them stable.
       *
       * @param rowName - The name of the row
       * @param visibleCol - The visible column index
       * @returns The sequence position (0-based), or undefined if it's a gap
       */
      visibleColToSeqPos(rowName: string, visibleCol: number) {
        // a binary search of the row's index, not a scan of the row: this
        // answers on every mouse move, and a 30k-column row scanned per event
        // is the whole frame
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
       * Convert a visible column index (what a mouse handler reports) back to a
       * column of the full alignment. Hidden columns shift everything to their
       * right, so a host that holds per-column data of its own has to make this
       * hop before indexing it.
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
       * Returns undefined for a row the alignment does not have -- answering
       * anyway is how a mistyped or stale row name came to highlight column 0.
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
       * #getter
       * every reason a mapping is being ignored, so a host can say which. A
       * mapping outlives the alignment it was computed for; when the two no
       * longer agree the lookups have to refuse, and refusing invisibly is how
       * "there is no structure here" gets confused with "this data is stale".
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
       * the mappings that still fit the loaded alignment. A row-level problem
       * takes the whole mapping out; a single malformed segment takes only
       * itself, since the rest of the mapping is still a claim about residues
       * that exist.
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
       * the structures the loaded alignment has usable mappings onto. A row can
       * have several -- an experimental entry and a predicted model, say -- so
       * a host that means a particular one has to name it.
       */
      get mappedStructures() {
        return this.usableResidueMappings.map(m => ({
          row: m.row,
          structure: m.structure,
        }))
      },

      /**
       * #method
       * The structure residue a row residue is, or undefined. Refusing is the
       * point: the guess this replaces answered every query, with a wrong
       * residue when it did not know.
       *
       * It also refuses when the answer is not unique. A row commonly maps onto
       * several structures -- an experimental entry and two predicted models --
       * and returning whichever came first would be the same class of wrong,
       * quieter. Name one with `structureId`, or use `mappedStructures` to see
       * what there is.
       *
       * Positions are 1-based, as `residueMappings` and `highlights` are --
       * note that the column helpers above take 0-based ones.
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
       * The row residue a structure residue is, the same lookup backwards, and
       * refusing on the same terms. `asymId` picks between mappings onto the
       * same entry, which a homodimer -- two rows, two chains, one id -- always
       * needs; without it such a lookup is ambiguous and gets nothing.
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
       * the vertical space the alignment rows actually get: the widget height
       * less everything stacked above and below them -- the header, the tracks,
       * and the minimap when the columns overflow. Every consumer wants this
       * same subtraction, so there is one of it: blocksY, maxScrollY, the
       * vertical scrollbar and fitVertically all read it, and a second getter
       * that forgot the tracks is what put the last rows out of reach.
       */
      get msaAreaHeight() {
        return (
          self.height -
          (self.showHorizontalScrollbar ? self.minimapHeight : 0) -
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
       * one representative annotation per accession, which is what the legend,
       * the filter dialog and the palettes key off
       */
      get annotationTypes() {
        // first occurrence wins. The representative supplies only the name,
        // description and -- for ordinal segments -- the start that orders
        // them, and those agree across an accession's instances
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
        // truthiness, not `!== ''`: these are types.maybe, and DataModel's
        // postProcessSnapshot drops a document over 50kb, so a restored session
        // that inlined a large alignment comes back `undefined` here -- which
        // `!== ''` reads as initialized and renders an empty view instead of
        // the import form
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
       * most-negative allowed scrollY, keeping the last row in view rather than
       * letting the whole alignment scroll off the top.
       */
      get maxScrollY() {
        return Math.min(-self.totalHeight + self.msaAreaHeight, 0)
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
       * set hovered tree node and its descendants
       */
      setHoveredTreeNode(nodeId?: string) {
        // the tree's mousemove handler calls this on every event, and both the
        // lookup and the write are expensive: `find` walks the whole hierarchy,
        // and a fresh object here invalidates hoveredRowIndices and redraws the
        // tree and MSA overlays. Re-hovering the same node is the common case
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
       * distances. Refuses above `maxNeighborJoiningRows`: the join loop is
       * cubic and runs on the main thread, so 800 rows is a ten-second freeze
       * with no progress and no cancel, and a tree that size wants a tool built
       * for it anyway.
       */
      calculateNeighborJoiningTreeFromMSA() {
        // every sequence in the alignment, not the rows on screen: a collapsed
        // clade is a display state, and building the tree from what it leaves
        // showing drops the sequences it hides out of the result
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
       * swap in a different tree over the same alignment. Node ids are derived
       * from the path (node-0-0-1), so a `collapsed` or `showOnly` id held over
       * from the old tree matches a real node in the new one and folds whatever
       * happens to sit there -- the ids go with the tree they name.
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
       * horizontally. Vertically the anchor is biased toward the top: when the
       * alignment nearly fits the viewport, snap to y=0 rather than pinning a
       * random row under the cursor, with the bias fading out as the alignment
       * grows taller than the viewport (where cursor-anchoring is useful).
       * Drives wheel/trackpad-pinch zoom.
       */
      zoomToPos(scaleFactor: number, offsetX: number, offsetY: number) {
        transaction(() => {
          const colInView = (-self.scrollX + offsetX) / self.colWidth
          const rowInView = (-self.scrollY + offsetY) / self.rowHeight
          self.colWidth = clamp(
            self.colWidth * scaleFactor,
            minColWidth,
            maxCellSize,
          )
          self.rowHeight = clamp(
            self.rowHeight * scaleFactor,
            minRowHeight,
            maxCellSize,
          )
          self.scrollX = clamp(
            offsetX - colInView * self.colWidth,
            self.maxScrollX,
            0,
          )

          const anchoredScrollY = offsetY - rowInView * self.rowHeight
          // maxScrollY is -(totalHeight - visibleMsaHeight) when the alignment
          // overflows, so -maxScrollY is exactly that overflow past the
          // scrollable MSA viewport (0 when it fits)
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
       * Set the overlay annotations (an empty list clears them). Every source
       * funnels through here after its own adapter has flattened it:
       * InterProScan, GFF, user uploads, NCBI CDD.
       *
       * It does not touch `showDomains`. Loading used to force the overlay on,
       * and since a restored snapshot loads its GFF again on the way in, a link
       * shared with the overlay hidden reopened with it drawn.
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
       * replace the alignment<->structure correspondence (see docs/layers.md)
       */
      setResidueMappings(mappings: ResidueMapping[]) {
        self.residueMappings.replace(mappings)
      },
      /**
       * #action
       */
      toggleTrack(id: string) {
        // the stored value is "is off", so the current shown state is exactly
        // what the flipped entry should hold
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
       * width of the alignment canvas itself: the msa area less the vertical
       * scrollbar sitting in it. Not usable from showHorizontalScrollbar, which
       * feeds msaAreaHeight -> showVerticalScrollbar and would close a cycle
       */
      get msaCanvasWidth() {
        return self.msaAreaWidth - this.verticalScrollbarWidth
      },
      /**
       * #getter
       * ordinal segment types (exons etc.), ordered by sequence position so
       * exon-1..exon-14 read left-to-right; colored by alternating shade and
       * labeled by number rather than each getting a distinct hue + legend row
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
          colord(val).darken(0.1).toHex(),
        ])
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
       * by the on-screen legend and the SVG export legend. Ordinal segments
       * (exons) are excluded — they read as a numbered gene model, not a color
       * key — so this is the categorical types ordered by sequence position
       */
      get visibleDomainTypes() {
        return this.categoricalDomainTypes
          .filter(d => !self.turnedOffFeatures.get(d.accession))
          .toSorted((a, b) => a.start - b.start)
      },

      /**
       * #getter
       * every filtered-on annotation resolved to the visible column span it is
       * drawn across, keyed by row name. Each row is ordered longest-first so a
       * short domain nested inside a long one draws on top of it rather than
       * under it. Resolving these once here rather than inside each canvas
       * block removes a per-feature, per-block sequence position conversion
       * from every redraw, and gives the letter renderer the band colors it
       * needs to keep residues readable on top of the boxes.
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
              // annotation positions are 1-based and inclusive. Both ends count
              // the visible columns in front of a global column, so endCol is
              // the exclusive column after the last residue's own column --
              // the band stops there rather than stretching across a following
              // gap run -- and a residue whose column is itself hidden
              // collapses onto the neighbouring boundary instead of dropping
              // the band. A band whose every column is hidden spans nothing
              // and is left out, as is one naming a row the alignment lacks.
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
            // numbered after the drop, so a band that resolved to nothing does
            // not leave an empty sub-row behind it
            .map((band, stackIndex) => ({ ...band, stackIndex }))
          if (rowBands.length > 0) {
            bands.set(name, rowBands)
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
        // the shared empty array, so moving the mouse across an alignment with
        // no annotations does not hand every canvas block a new value to
        // re-render on
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
       * canvases so they cannot disagree, and resolved through the memoized
       * name->index map rather than rebuilding a lookup on each mouse move.
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
       * draws as one bordered band. Computed here because the overlay canvas
       * redraws on every mouse move while the highlight itself rarely changes.
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
        const { blanks, rowNamesSet, transientHighlights } = self
        const toVisible = (globalCol: number) => {
          const visible = self.globalColToVisibleCol(globalCol)
          return visible ?? visibleColsBefore(blanks, globalCol)
        }
        // the document's own highlights first, then what each owner is showing
        // right now, so a hover draws over a persisted band rather than under it
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
          let startGlobal = start - 1
          let endGlobal = end - 1
          if (row !== undefined) {
            const rowStart = self.seqPosToGlobalCol(row, start - 1)
            const rowEnd = self.seqPosToGlobalCol(row, end - 1)
            if (rowStart === undefined || rowEnd === undefined) {
              return []
            }
            startGlobal = rowStart
            endGlobal = rowEnd
          }
          const startCol = toVisible(startGlobal)
          const endVisible = self.globalColToVisibleCol(endGlobal)
          const endCol = endVisible ?? visibleColsBefore(blanks, endGlobal) - 1
          return startCol <= endCol
            ? [{ ...base, startCol, endCol, rowIndices: [] }]
            : []
        })
      },

      /**
       * #getter
       * per-column summary statistics for the hovered column: consensus residue
       * and its identity fraction, conservation score, gap fraction, and the
       * sorted non-gap residue distribution. undefined when nothing is hovered.
       */
      get mouseOverColumnStats() {
        const { mouseCol } = self
        if (mouseCol === undefined) {
          return undefined
        }
        const { colStats } = self
        if (mouseCol >= colStats.numColumns) {
          return undefined
        }
        const total = colStats.total(mouseCol)
        if (!total) {
          return undefined
        }
        const gaps = colStats.gapCount(mouseCol)
        const distribution = colStats
          .residueEntries(mouseCol)
          .sort((a, b) => b[1] - a[1])
        const consensus = distribution[0]
        return {
          col: mouseCol,
          total,
          gaps,
          gapFraction: gaps / total,
          conservation: self.conservation[mouseCol] ?? 0,
          propertyConservation: self.propertyConservation[mouseCol],
          consensusLetter: consensus?.[0] ?? '',
          consensusCount: consensus?.[1] ?? 0,
          consensusFraction: consensus ? consensus[1] / total : 0,
          distribution,
        }
      },

      /**
       * #method
       */
      getRowData(name: string) {
        return {
          data: self.MSA?.getRowData(name),
          treeMetadata: self.treeMetadata[name],
        }
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
      setConservationTrackHeight(arg: number) {
        self.conservationTrackHeight = arg
      },
      /**
       * #action
       */
      setColumnTrackHeight(id: string, height: number) {
        self.columnTrackHeights = { ...self.columnTrackHeights, [id]: height }
      },
      /**
       * #action
       */
      setSequenceLogoTrackHeight(arg: number) {
        self.sequenceLogoTrackHeight = arg
      },
      /**
       * #action
       */
      setArcTrackHeight(arg: number) {
        self.arcTrackHeight = arg
      },
      /**
       * #action
       * Return to the import form: every property off `preservedOnReset`
       * (data, filehandles, collapsed/showOnly, zoom, scroll, ...) goes back
       * to its default, then the file-derived volatiles applySnapshot cannot
       * reach are cleared by hand.
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
       * draw this annotation type, or stop drawing it. Only the "stop" is
       * recorded -- see `turnedOffFeatures`
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
        // Each direction's viewport depends on the other's result: fitting the
        // rows while the columns still overflow measures against a height the
        // minimap is taking, and fitting the columns while the rows still
        // overflow measures against a width the vertical scrollbar is taking.
        // A second pass measures against the geometry the first pass produced,
        // which is the one the reader ends up looking at.
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
       */
      fitHorizontally() {
        if (self.numColumns > 0) {
          // fitting to msaAreaWidth instead left the last ~20px of columns off
          // the right edge -- and short of the width that shows a minimap, so
          // nothing on screen said they were there
          self.colWidth = clamp(
            self.msaCanvasWidth / self.numColumns,
            minColWidth,
            maxCellSize,
          )
        }
        self.scrollX = 0
      },

      afterCreate() {
        // seed the highlighted-columns overlay from the declarative property so
        // a shared snapshot/URL opens with those columns highlighted (the
        // volatile highlightedColumns can later be driven by genome-hover sync)
        if (self.highlightColumns?.length) {
          self.setHighlightedColumns(self.highlightColumns)
        }

        // track the live device pixel ratio so canvas backing stores re-scale
        // when the window moves between monitors or the browser zooms. The
        // matchMedia query is pinned to the current ratio, so each change
        // re-registers against the new one to keep tracking further moves.
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
         * Every loader carries a generation guard: the filehandle can change
         * mid-fetch (a second file picked while the first is still in flight),
         * and the slower earlier request must not clobber the data, status, or
         * loading flag belonging to the newer one. A superseded or cleared
         * request is also aborted, rather than left downloading a file nothing
         * is waiting for, and it gives back the status line it was writing --
         * a reset() mid-download used to leave "Downloading file" and a Cancel
         * button behind on the import form.
         *
         * `clearFilehandle` serves two purposes for the loaders that pass it.
         * A local file has no URL to refetch from, so the handle is dropped
         * once its bytes are in the model; and a fetch the user cancels drops
         * it too, returning the view to the import form rather than leaving a
         * stuck spinner.
         *
         * `what` names the layer in a failure message. An optional layer
         * (annotations, row metadata) that fails to load is a warning: it is
         * not worth replacing an alignment the reader is looking at with an
         * error screen over a decorative file.
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

        // treeMetadata is decorative and has no import-form step of its own, so
        // it keeps no loading flag and nothing to return to on cancel
        loadOnFilehandleChange({
          what: 'row metadata',
          optional: true,
          getFilehandle: () => self.treeMetadataFilehandle,
          onLoad: text => {
            self.setTreeMetadata(text)
          },
        })

        // autorun parses inline gff text from data.gff. Text that goes away
        // takes its annotations with it -- setData with a new alignment and no
        // gff used to leave the previous file's annotations drawn over it --
        // while annotations a host set directly are left alone, which is why
        // this tracks what it applied instead of reading the current list
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
                // a malformed overlay is not worth replacing the alignment
                // with an error screen
                console.error(e)
                self.addWarning(`The annotations did not parse: ${e}`)
              }
            } else if (appliedGFF) {
              appliedGFF = false
              self.setAnnotations([])
            }
          }),
        )

        // gffFilehandle carries overlay annotations. It loads into data.gff and
        // the autorun above parses it, so there is one parse path whether the
        // text arrived from a file or from a snapshot
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

        // Keep the parse chain warm: reading self.columns transitively holds
        // self.MSA (parseMSA) computed alive, so it is parsed once per data
        // change rather than re-parsed on every non-reactive access. Do not
        // remove.
        // xref solution https://github.com/mobxjs/mobx/issues/266#issuecomment-222007278
        // xref problem https://github.com/GMOD/react-msaview/issues/75
        //
        // The column statistics are held for the same reason whenever something
        // reads them off the reactive path: dynamic color schemes, and the hover
        // tooltip, which is read from a mousemove handler. Without this the
        // tooltip's cost depends on whether some visible track happens to be
        // observing them, so closing the conservation track would silently turn
        // every mouse move into a full-alignment recount.
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

        // autorun: when autoTreeAreaWidth is set and no tree is drawn, shrink the
        // tree area to fit the row labels rather than padding it to the fixed
        // default. Gated on noTree/!drawTree so it never fights the treeWidth sync
        // below (treeAreaWidth here depends only on labelsWidth, not treeWidth).
        addDisposer(
          self,
          autorun(() => {
            if (
              self.autoTreeAreaWidth &&
              (self.noTree || !self.drawTree) &&
              self.labelsWidth
            ) {
              self.setTreeAreaWidth(self.labelsWidth + self.marginLeft + 12)
            }
          }),
        )

        // treeWidth trails the tree area, less whatever the labels take out of
        // it. A width that arrived with the snapshot is left alone until the
        // tree area itself moves: a host that opens a view with a narrow tree
        // beside wide labels -- jbrowse-plugin-msaview does, at treeWidth 100
        // in a 200px area -- had its value overwritten on the first frame, and
        // a restored session came back re-derived rather than as it was left.
        // A getter cannot do this: labelsWidth is measured off the leaves,
        // which are laid out against treeWidth.
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
              Math.max(50, areaWidth - labelsWidth - 10 - self.marginLeft),
            )
          }),
        )
      },
    }))
    .postProcessSnapshot(({ data, columnTracks, ...rest }) => ({
      // per-property defaults are stripped by the stripDefault helper; the only thing
      // it can't express is this cross-field rule: drop inline tree/msa/metadata
      // when a sibling filehandle can refetch them, keeping sessions/URLs small
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

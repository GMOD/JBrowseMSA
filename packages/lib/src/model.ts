import { clamp, groupBy, notEmpty, sum } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { ElementId, FileLocation } from '@jbrowse/core/util/types/mst'
import {
  addDisposer,
  applySnapshot,
  cast,
  getSnapshot,
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
  labelReferenceFontSize,
  maxCellSize,
  minColWidth,
  minLetterColWidth,
  minLetterRowHeight,
  minRowHeight,
  segmentFeatureTypes,
  segmentShades,
} from './constants.ts'
import { createPaletteMap } from './createPaletteMap.ts'
import { fetchTextWithProgress, isAbortError } from './fetchUtils.ts'
import { flatToTree } from './flatToTree.ts'
import {
  calcDepthToLeaf,
  clusterLayout,
  collapse,
  collapsedSubtreeMaxLength,
  find,
  findMaxBranchLen,
  forEachDescendant,
  hierarchy,
  leaves,
  links,
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
  visibleColToGlobalCol,
  visibleColToSeqPosForRow,
  visibleColsBefore,
} from './rowCoordinateCalculations.ts'
import { buildSeqPosIndex } from './seqPosToGlobalCol.ts'
import { maxBitsFor } from './sequenceLogo.ts'
import { stripDefault } from './stripDefault.ts'
import { computeRowInsertions, len, skipBlanks, transform } from './util.ts'
import { saveAs } from './vendor/fileSaver.ts'

import type { HierarchyNode } from './hierarchy.ts'
import type {
  Annotation,
  BasicTrack,
  DomainBand,
  NodeWithIds,
  NodeWithIdsAndLength,
} from './types.ts'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { Instance } from '@jbrowse/mobx-state-tree'
import type { Theme } from '@mui/material'
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
function trackIsOff(
  turnedOffTracks: { get: (id: string) => boolean | undefined },
  id: string,
) {
  return turnedOffTracks.get(id) ?? defaultOffTracks.has(id)
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
         */
        featureFilters: stripDefault(types.map(types.boolean), {}),
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
      status: undefined as
        | { msg: string; url?: string; onCancel?: () => void }
        | undefined,
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
       */
      minimapHeight: 56,

      /**
       * #volatile
       */
      conservationTrackHeight: 40,

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
      marginLeft: 20,

      /**
       * #volatile
       */
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      error: undefined as unknown,

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
       * set mouse position (row, column) in the MSA
       *
       * CROSS-REPO CONTRACT: jbrowse-plugin-protein3d calls this (and reads the
       * `mouseCol` volatile) to sync MSA<->3D-structure hover. Keep the name and
       * signature stable; see that repo's ProteinToMsaHoverSync.tsx.
       */
      setMousePos(col?: number, row?: number) {
        self.mouseCol = col
        self.mouseRow = row
      },

      /**
       * #action
       * set highlighted columns
       *
       * CROSS-REPO CONTRACT: called by jbrowse-plugin-msaview
       * (afterCreateAutoruns.ts) to highlight alignment columns. It has no
       * in-repo caller, so do not flag it as dead code — it is public API.
       */
      setHighlightedColumns(columns?: number[]) {
        self.highlightedColumns = columns
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
       *
       */
      setCurrentAlignment(n: number) {
        self.currentAlignment = n
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
      setTreeMetadataFilehandle(treeMetadataFilehandle?: FileLocationType) {
        self.treeMetadataFilehandle = treeMetadataFilehandle
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
       * #method
       * unused here, but can be used by derived classes to add extra items
       */
      extraViewMenuItems() {
        return []
      },
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
       * #getter
       * per-row index of the global column holding each ungapped sequence
       * position, so seqPos -> column is a lookup rather than a scan of the row.
       * The domain overlay resolves thousands of these per redraw.
       */
      get seqPosGlobalColIndex() {
        return new Map(
          this.rows.map(
            ([name, seq]) => [name, buildSeqPosIndex(seq)] as const,
          ),
        )
      },

      /**
       * #getter
       */
      get rowMap() {
        return new Map(this.rows)
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
        r.data.length = 0
        const max = maxLength(r)
        const k = max ? self.treeWidth / max : 0
        setBrLength(r, 0, k)
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
       * max branch length across the tree, used to scale phylogram x-positions
       */
      get maxBranchLength() {
        return findMaxBranchLen(this.hierarchy)
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
        return links(this.hierarchy).every(s => !s.source.data.length)
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
          viewportSize: this.visibleMsaHeight,
          viewportPos: -self.scrollY,
          blockSize: self.blockSize,
          mapSize: self.totalHeight,
        })
      },
      /**
       * #getter
       * height of the alignment viewport, px. The same subtraction as
       * msaAreaHeight, which is defined later in the views chain
       */
      get visibleMsaHeight() {
        return (
          self.height -
          self.headerHeight -
          (self.msaAreaWidth < self.totalWidth ? self.minimapHeight : 0)
        )
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
        return Math.min(-self.totalHeight + self.visibleMsaHeight, 0)
      },
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
       * Calculate a neighbor joining tree from the current MSA using BLOSUM62 distances
       */
      calculateNeighborJoiningTreeFromMSA() {
        if (self.rows.length < 2) {
          throw new Error('Need at least 2 sequences to build a tree')
        }
        const newickTree = calculateNeighborJoiningTree(self.rows)
        self.setTree(newickTree)
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
       * Set the overlay annotations and reveal the overlay in a single step (an
       * empty list clears both). Every source funnels through here after its
       * own adapter has flattened it: InterProScan, GFF, user uploads, NCBI CDD.
       */
      setAnnotations(annotations: Annotation[]) {
        self.annotations = annotations
        self.setShowDomains(annotations.length > 0)
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
      toggleTrack(id: string) {
        // the stored value is "is off", so the current shown state is exactly
        // what the flipped entry should hold
        self.turnedOffTracks.set(id, !trackIsOff(self.turnedOffTracks, id))
      },
      /**
       * #action
       */
      setStatus(status?: { msg: string; url?: string; onCancel?: () => void }) {
        self.status = status
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
       */
      get adapterTrackModels(): BasicTrack[] {
        const { rowHeight, MSA, hideGapsEffective, blanks } = self
        const tracks = MSA?.tracks ?? []
        return tracks
          .filter(t => !!t.data)
          .map(t => ({
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
       */
      get tracks(): BasicTrack[] {
        const conservationTrack = {
          id: 'conservation',
          name: 'Conservation',
          kind: 'bar' as const,
          height: self.conservationTrackHeight,
          barColor: 'gray',
        }
        const propertyConservationTrack = {
          id: 'property-conservation',
          name: 'Property conservation',
          kind: 'bar' as const,
          height: self.conservationTrackHeight,
          barColor: '#6a51a3',
        }
        const sequenceLogoTrack = {
          id: 'sequence-logo',
          name: 'Sequence logo',
          kind: 'logo' as const,
          height: self.sequenceLogoTrackHeight,
        }
        return [
          ...this.adapterTrackModels,
          ...[
            conservationTrack,
            ...(self.sequenceType === 'amino'
              ? [propertyConservationTrack]
              : []),
            sequenceLogoTrack,
          ].map(model => ({ model, ReactComponent: TrackBlocks })),
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
        return self.msaAreaWidth < self.totalWidth
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
        const { rowMap, blanks } = self
        return rowMap.get(rowName)?.[visibleColToGlobalCol(blanks, visibleCol)]
      },

      /**
       * #method
       * Convert a visible column to a row-specific sequence position (0-based).
       * Returns undefined if the position is a gap in the sequence.
       *
       * CROSS-REPO CONTRACT: this and the sibling coordinate converters
       * (seqPosToVisibleCol, globalColToVisibleCol, seqPosToGlobalCol) are used
       * by jbrowse-plugin-protein3d to translate between alignment columns and
       * structure/sequence residue positions across gaps. Keep them stable.
       *
       * @param rowName - The name of the row
       * @param visibleCol - The visible column index
       * @returns The sequence position (0-based), or undefined if it's a gap
       */
      visibleColToSeqPos(rowName: string, visibleCol: number) {
        return visibleColToSeqPosForRow({
          rowName,
          visibleCol,
          rowMap: self.rowMap,
          blanks: self.blanks,
        })
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
       * Convert a sequence position (ungapped) to a global column index.
       *
       * @param rowName - The name of the row
       * @param seqPos - The sequence position (0-based, ungapped)
       * @returns The global column index in the full MSA
       */
      seqPosToGlobalCol(rowName: string, seqPos: number) {
        const seq = self.rowMap.get(rowName)
        if (seq === undefined) {
          return 0
        }
        const col = self.seqPosGlobalColIndex.get(rowName)?.[seqPos]
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
        return this.globalColToVisibleCol(globalCol)
      },
    }))

    .views(self => ({
      /**
       * #getter
       * widget width minus the tree area gives the space for the MSA
       */
      get msaAreaHeight() {
        return (
          self.height -
          (self.showHorizontalScrollbar ? self.minimapHeight : 0) -
          self.headerHeight
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
        return self.annotations.filter(r =>
          self.featureFilters.get(r.accession),
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
        return self.msaAreaHeight < self.totalHeight
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
          .filter(d => self.featureFilters.get(d.accession))
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
              // and is left out.
              const startCol = visibleColsBefore(
                blanks,
                self.seqPosToGlobalCol(name, annotation.start - 1),
              )
              const endCol = visibleColsBefore(
                blanks,
                self.seqPosToGlobalCol(name, annotation.end - 1) + 1,
              )
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
      get mouseOverDomains() {
        const { mouseCol } = self
        const name = self.mouseOverRowName
        return name !== undefined && mouseCol !== undefined
          ? (this.domainBands.get(name) ?? [])
              .filter(b => mouseCol >= b.startCol && mouseCol < b.endCol)
              .map(b => b.annotation)
          : []
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
      setSequenceLogoTrackHeight(arg: number) {
        self.sequenceLogoTrackHeight = arg
      },
      /**
       * #action
       * Return to the import form: every property off `preservedOnReset`
       * (data, filehandles, collapsed/showOnly, zoom, scroll, ...) goes back
       * to its default, then the file-derived volatiles applySnapshot cannot
       * reach are cleared by hand.
       */
      reset() {
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
        self.setMousePos(undefined, undefined)
        self.setMouseClickPos(undefined, undefined)
        self.setHoveredTreeNode(undefined)
      },
      /**
       * #action
       */
      async exportSVG(opts: {
        theme: Theme
        includeMinimap?: boolean
        includeTracks?: boolean
        exportType: 'entire' | 'viewport'
      }) {
        const { renderToSvg } = await import('./renderToSvg.tsx')
        const html = await renderToSvg(self as MsaViewModel, opts)
        const blob = new Blob([html], { type: 'image/svg+xml' })
        saveAs(blob, 'image.svg')
      },
      initFilter(arg: string) {
        if (!self.featureFilters.has(arg)) {
          self.featureFilters.set(arg, true)
        }
      },
      setFilter(arg: string, flag: boolean) {
        self.featureFilters.set(arg, flag)
      },

      /**
       * #action
       */
      fit() {
        this.fitVertically()
        this.fitHorizontally()
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

        addDisposer(
          self,
          autorun(() => {
            for (const key of self.annotationTypes.keys()) {
              this.initFilter(key)
            }
          }),
        )

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
         * loading flag belonging to the newer one.
         *
         * `clearFilehandle` serves two purposes for the loaders that pass it.
         * A local file has no URL to refetch from, so the handle is dropped
         * once its bytes are in the model; and a fetch the user cancels drops
         * it too, returning the view to the import form rather than leaving a
         * stuck spinner.
         */
        const loadOnFilehandleChange = ({
          getFilehandle,
          onLoad,
          setLoading,
          clearFilehandle,
        }: {
          getFilehandle: () => FileLocationType | undefined
          onLoad: (text: string) => void
          setLoading?: (arg: boolean) => void
          clearFilehandle?: () => void
        }) => {
          let generation = 0
          addDisposer(
            self,
            autorun(async () => {
              const filehandle = getFilehandle()
              // a cleared filehandle bumps the generation too, so a reset()
              // mid-download invalidates the in-flight fetch instead of letting
              // its onLoad land on the emptied model. That also orphans the
              // invalidated run's `finally`, so the loading flag is cleared
              // here on its behalf
              const current = ++generation
              if (!filehandle) {
                setLoading?.(false)
                return
              }
              const isCurrent = () => current === generation
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
                    self.setError(e)
                  }
                }
              } finally {
                if (isCurrent()) {
                  setLoading?.(false)
                }
              }
            }),
          )
        }

        loadOnFilehandleChange({
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
          getFilehandle: () => self.treeMetadataFilehandle,
          onLoad: text => {
            self.setTreeMetadata(text)
          },
        })

        // autorun parses inline gff text from data.gff
        addDisposer(
          self,
          autorun(() => {
            const gffText = self.data.gff
            if (gffText) {
              try {
                self.applyGFFText(gffText)
              } catch (e) {
                console.error(e)
                self.setError(e)
              }
            }
          }),
        )

        // gffFilehandle carries overlay annotations
        loadOnFilehandleChange({
          getFilehandle: () => self.gffFilehandle,
          onLoad: text => {
            self.applyGFFText(text)
          },
          clearFilehandle: () => {
            self.setGFFFilehandle(undefined)
          },
        })

        loadOnFilehandleChange({
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

        // autorun synchronizes treeWidth with treeAreaWidth
        addDisposer(
          self,
          autorun(() => {
            self.setTreeWidth(
              Math.max(
                50,
                self.treeAreaWidth - self.labelsWidth - 10 - self.marginLeft,
              ),
            )
          }),
        )
      },
    }))
    .postProcessSnapshot(({ data, ...rest }) => ({
      // per-property defaults are stripped by the stripDefault helper; the only thing
      // it can't express is this cross-field rule: drop inline tree/msa/metadata
      // when a sibling filehandle can refetch them, keeping sessions/URLs small
      ...rest,
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

import {
  clamp,
  fetchAndMaybeUnzipText,
  groupBy,
  localStorageGetBoolean,
  localStorageSetBoolean,
  notEmpty,
  sum,
} from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { ElementId, FileLocation } from '@jbrowse/core/util/types/mst'
import {
  A3mMSA,
  ClustalMSA,
  EmfMSA,
  FastaMSA,
  StockholmMSA,
  generateNodeIds,
  gffToInterProResults,
  parseGFF,
  parseNewick,
} from '@react-msaview/parsers'
import { colord } from 'colord'
import { ascending } from 'd3-array'
import { cluster, hierarchy } from 'd3-hierarchy'
import { parseEmfTree } from 'emf-js'
import { saveAs } from 'file-saver'
import { autorun, transaction } from 'mobx'
import { addDisposer, cast, types } from 'mobx-state-tree'
import Stockholm from 'stockholm-js'

import { blocksX, blocksY } from './calculateBlocks'
import colorSchemes from './colorSchemes'
import ConservationTrack from './components/ConservationTrack'
import TextTrack from './components/TextTrack'
import {
  defaultAllowedGappyness,
  defaultBgColor,
  defaultColWidth,
  defaultColorSchemeName,
  defaultContrastLettering,
  defaultCurrentAlignment,
  defaultDrawLabels,
  defaultDrawMsaLetters,
  defaultDrawNodeBubbles,
  defaultDrawTree,
  defaultHeight,
  defaultHideGaps,
  defaultLabelsAlignRight,
  defaultRowHeight,
  defaultScrollX,
  defaultScrollY,
  defaultShowBranchLen,
  defaultShowDomains,
  defaultSubFeatureRows,
  defaultTreeAreaWidth,
  defaultTreeWidth,
  defaultTreeWidthMatchesArea,
} from './constants'
import { flatToTree } from './flatToTree'
import palettes from './ggplotPalettes'
import { measureTextCanvas } from './measureTextCanvas'
import { DataModelF } from './model/DataModel'
import { DialogQueueSessionMixin } from './model/DialogQueue'
import { MSAModelF } from './model/msaModel'
import { TreeModelF } from './model/treeModel'
import { calculateNeighborJoiningTree } from './neighborJoining'
import { parseAsn1 } from './parseAsn1'
import { reparseTree } from './reparseTree'
import {
  globalColToVisibleCol,
  visibleColToGlobalCol,
  visibleColToSeqPosForRow,
} from './rowCoordinateCalculations'
import { seqPosToGlobalCol } from './seqPosToGlobalCol'
import { collapse, len, maxLength, setBrLength, skipBlanks } from './util'

import type { InterProScanResults } from './launchInterProScan'
import type {
  Accession,
  BasicTrack,
  NodeWithIds,
  NodeWithIdsAndLength,
  TextTrackModel,
} from './types'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { Theme } from '@mui/material'
import type { HierarchyNode } from 'd3-hierarchy'
import type { Instance } from 'mobx-state-tree'

const showZoomStarKey = 'msa-showZoomStar'

/**
 * #stateModel MsaView
 * extends
 * - DialogQueueSessionMixin
 * - MSAModel
 * - Tree
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
        showDomains: defaultShowDomains,
        /**
         * #property
         */
        hideGaps: defaultHideGaps,
        /**
         * #property
         */
        allowedGappyness: defaultAllowedGappyness,
        /**
         * #property
         */
        contrastLettering: defaultContrastLettering,

        /**
         * #property
         */
        subFeatureRows: defaultSubFeatureRows,

        /**
         * #property
         * hardcoded view type
         */
        type: types.literal('MsaView'),

        /**
         * #property
         */
        drawMsaLetters: defaultDrawMsaLetters,

        /**
         * #property
         * height of the div containing the view, px
         */
        height: types.optional(types.number, defaultHeight),

        /**
         * #property
         * height of each row, px
         */
        rowHeight: defaultRowHeight,

        /**
         * #property
         * scroll position, Y-offset, px
         */
        scrollY: defaultScrollY,

        /**
         * #property
         * scroll position, X-offset, px
         */
        scrollX: defaultScrollX,

        /**
         * #property
         * width of columns, px
         */
        colWidth: defaultColWidth,

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
         * filehandle object for InterProScan GFF file
         */
        gffFilehandle: types.maybe(FileLocation),

        /**
         * #property
         *
         */
        currentAlignment: defaultCurrentAlignment,

        /**
         * #property
         * array of tree parent nodes that are 'collapsed' (all children are
         * hidden)
         */
        collapsed: types.array(types.string),

        /**
         * #property
         * array of tree leaf nodes that are 'collapsed' (just that leaf node
         * is hidden)
         */
        collapsedLeaves: types.array(types.string),
        /**
         * #property
         * focus on particular subtree
         */
        showOnly: types.maybe(types.string),
        /**
         * #property
         * turned off tracks
         */
        turnedOffTracks: types.map(types.boolean),

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
        featureFilters: types.map(types.boolean),
        /**
         * #property
         */
        relativeTo: types.maybe(types.string),
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
      status: undefined as { msg: string; url?: string } | undefined,
      /**
       * #volatile
       * high resolution scale factor, helps make canvas look better on hi-dpi
       * screens
       */
      highResScaleFactor: 2,

      /**
       * #volatile
       * obtained from localStorage
       */
      showZoomStar: localStorageGetBoolean(showZoomStarKey, false),
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
       * a dummy variable that is incremented when ref changes so autorun for
       * drawing canvas commands will run
       */
      nref: 0,

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
      error: undefined as unknown,

      /**
       * #volatile
       */
      annotPos: undefined as { left: number; right: number } | undefined,

      /**
       * #volatile
       */
      interProAnnotations: undefined as
        | undefined
        | Record<string, InterProScanResults>,
    }))
    .actions(self => ({
      /**
       * #action
       */
      drawRelativeTo(id: string | undefined) {
        self.relativeTo = id
      },
      /**
       * #action
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
      setContrastLettering(arg: boolean) {
        self.contrastLettering = arg
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
      setShowZoomStar(arg: boolean) {
        self.showZoomStar = arg
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
       */
      setMousePos(col?: number, row?: number) {
        self.mouseCol = col
        self.mouseRow = row
      },

      /**
       * #action
       * set hovered tree node and its descendants
       */
      setHoveredTreeNode(nodeId?: string) {
        if (!nodeId) {
          self.hoveredTreeNode = undefined
          return
        }

        // Find the node in the hierarchy
        const node = (self as MsaViewModel).hierarchy.find(
          n => n.data.id === nodeId,
        )
        if (!node) {
          self.hoveredTreeNode = undefined
          return
        }

        // Get all descendant leaf names
        const descendantNames = node.leaves().map((leaf: any) => leaf.data.name)

        self.hoveredTreeNode = { nodeId, descendantNames }
      },
      /**
       * #action
       * set highlighted columns
       */
      setHighlightedColumns(columns?: number[]) {
        self.highlightedColumns = columns
      },
      /**
       * #action
       */
      setShowDomains(arg: boolean) {
        self.showDomains = arg
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
       * set scroll Y-offset (px)
       */
      setScrollY(n: number) {
        self.scrollY = n
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
       */
      toggleCollapsedLeaf(node: string) {
        if (self.collapsedLeaves.includes(node)) {
          self.collapsedLeaves.remove(node)
        } else {
          self.collapsedLeaves.push(node)
        }
      },
      /**
       * #action
       */
      setShowOnly(node?: string) {
        self.showOnly = node
      },

      /**
       * #action
       */
      setData(data: { msa?: string; tree?: string; treeMetadata?: string }) {
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
    }))

    .views(self => ({
      /**
       * #getter
       * hideGaps takes effect when there are collapsed rows or allowedGappyness < 100
       */
      get hideGapsEffective() {
        return (
          self.hideGaps &&
          (self.collapsed.length > 0 ||
            self.collapsedLeaves.length > 0 ||
            self.allowedGappyness < 100)
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
        return self.showDomains && !!self.interProAnnotations
      },
      /**
       * #getter
       */
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
        return colorSchemes[self.colorSchemeName]!
      },

      /**
       * #getter
       */
      get header() {
        return this.MSA?.getHeader() || {}
      },

      /**
       * #getter
       */
      get alignmentNames() {
        return this.MSA?.alignmentNames || []
      },
      /**
       * #getter
       */
      get noTree() {
        return !!this.tree.noTree
      },
      /**
       * #getter
       */
      get noDomains() {
        return !self.interProAnnotations
      },
      /**
       * #getter
       */
      menuItems() {
        return []
      },
      /**
       * #getter
       */
      get treeMetadata() {
        return self.data.treeMetadata ? JSON.parse(self.data.treeMetadata) : {}
      },
      /**
       * #getter
       */
      get MSA() {
        const text = self.data.msa
        if (text) {
          if (Stockholm.sniff(text)) {
            return new StockholmMSA(text, self.currentAlignment)
          } else if (A3mMSA.sniff(text)) {
            return new A3mMSA(text)
          } else if (text.startsWith('>')) {
            return new FastaMSA(text)
          } else if (text.startsWith('SEQ')) {
            return new EmfMSA(text)
          } else {
            return new ClustalMSA(text)
          }
        }
        return null
      },
      /**
       * #getter
       */
      get numColumns() {
        return (this.MSA?.getWidth() || 0) - this.blanks.length
      },

      /**
       * #getter
       */
      get tree(): NodeWithIds {
        const text = self.data.tree

        return reparseTree(
          text
            ? generateNodeIds(
                text.startsWith('BioTreeContainer')
                  ? flatToTree(parseAsn1(text))
                  : parseNewick(
                      text.startsWith('SEQ') ? parseEmfTree(text).tree : text,
                    ),
              )
            : this.MSA?.getTree() || {
                noTree: true,
                children: [],
                id: 'empty',
                name: 'empty',
              },
        )
      },

      /**
       * #getter
       */
      get rowNames(): string[] {
        return this.leaves.map(n => n.data.name)
      },
      /**
       * #getter
       */
      get mouseOverRowName() {
        const { mouseRow } = self
        return mouseRow === undefined ? undefined : this.rowNames[mouseRow]
      },
      /**
       * #getter
       * Returns insertion info if mouse is hovering over an insertion indicator
       */
      get hoveredInsertion() {
        const { mouseCol, mouseRow } = self
        if (mouseCol === undefined || mouseRow === undefined) {
          return undefined
        }
        const rowName = this.rowNames[mouseRow]
        if (!rowName) {
          return undefined
        }
        const insertions = this.insertionPositions.get(rowName)
        if (!insertions) {
          return undefined
        }
        const insertion = insertions.find(ins => ins.pos === mouseCol)
        if (insertion) {
          return {
            rowName,
            col: mouseCol,
            letters: insertion.letters,
          }
        }
        return undefined
      },

      /**
       * #getter
       */
      get root() {
        let hier = hierarchy(this.tree, d => d.children)
          // todo: investigate whether needed, typescript says children always true

          .sum(d => (d.children ? 0 : 1))
          // eslint-disable-next-line unicorn/no-array-sort
          .sort((a, b) => ascending(a.data.length || 1, b.data.length || 1))

        if (self.showOnly) {
          const res = hier.find(n => n.data.id === self.showOnly)
          if (res) {
            hier = res
          }
        }

        ;[...self.collapsed, ...self.collapsedLeaves]
          .map(collapsedId => hier.find(node => node.data.id === collapsedId))
          .filter(notEmpty)
          .forEach(node => {
            collapse(node)
          })

        return hier
      },

      /**
       * #getter
       * widget width minus the tree area gives the space for the MSA
       */
      get msaAreaWidth() {
        return self.width - self.treeAreaWidth
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
        const numCols = strs[0]!.length
        const numRows = strs.length
        const threshold = Math.ceil((realAllowedGappyness / 100) * numRows)
        const blankCounts = new Uint16Array(numCols)
        for (let j = 0; j < numRows; j++) {
          const str = strs[j]!
          for (let i = 0; i < numCols; i++) {
            // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
            if ((str.charCodeAt(i) - 45) >>> 0 <= 1) {
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
       */
      get blanksSet() {
        return new Set(this.blanks)
      },
      /**
       * #getter
       * Returns a map of row name to array of insertions with display position and letters
       */
      get insertionPositions() {
        const { hideGapsEffective } = self
        const { blanks, rows } = this
        const blanksLen = blanks.length
        if (blanksLen === 0 || !hideGapsEffective) {
          return new Map<string, { pos: number; letters: string }[]>()
        }
        const result = new Map<string, { pos: number; letters: string }[]>()
        for (const [name, seq] of rows) {
          const insertions: { pos: number; letters: string }[] = []
          let displayPos = 0
          let blankIdx = 0
          let currentInsertPos = -1
          let letterChars: string[] = []
          const seqLen = seq.length
          for (let i = 0; i < seqLen; i++) {
            if (blankIdx < blanksLen && blanks[blankIdx] === i) {
              // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
              const code = seq.charCodeAt(i)
              if (!((code - 45) >>> 0 <= 1)) {
                if (currentInsertPos === displayPos) {
                  letterChars.push(seq[i])
                } else {
                  if (letterChars.length > 0) {
                    insertions.push({
                      pos: currentInsertPos,
                      letters: letterChars.join(''),
                    })
                  }
                  currentInsertPos = displayPos
                  letterChars = [seq[i]!]
                }
              }
              blankIdx++
            } else {
              displayPos++
            }
          }
          if (letterChars.length > 0) {
            insertions.push({
              pos: currentInsertPos,
              letters: letterChars.join(''),
            })
          }
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
       */
      get numRows() {
        return this.rows.length
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
        return Object.fromEntries(
          this.rows.map(
            (row, index) => [row[0], this.columns2d[index]!] as const,
          ),
        )
      },
      /**
       * #getter
       */
      get columns2d() {
        const { hideGapsEffective } = self
        return this.rows
          .map(r => r[1])
          .map(str => (hideGapsEffective ? skipBlanks(this.blanks, str) : str))
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
        const r = [] as Record<string, number>[]
        const columns = this.columns2d
        for (const column of columns) {
          for (let j = 0; j < column.length; j++) {
            const l = r[j] || {}
            const cj = column[j]!
            if (!l[cj]) {
              l[cj] = 0
            }
            l[cj]++
            r[j] = l
          }
        }
        return r
      },

      /**
       * #getter
       */
      get colStatsSums() {
        return this.colStats.map(val => sum(Object.values(val)))
      },

      /**
       * #getter
       * Pre-computed consensus letter and percent identity color per column.
       * Used by percent_identity_dynamic color scheme.
       */
      get colConsensus() {
        const { colStats, colStatsSums } = this
        return colStats.map((stats, i) => {
          const total = colStatsSums[i]!
          let maxCount = 0
          let letter = ''
          for (const key in stats) {
            const val = stats[key]!
            if (val > maxCount && key !== '-' && key !== '.') {
              maxCount = val
              letter = key
            }
          }
          const proportion = maxCount / total
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
        const { colStats, colStatsSums } = this
        return colStats.map((stats, i) => {
          const total = colStatsSums[i]!
          const colors: Record<string, string> = {}

          const W = stats.W ?? 0
          const L = stats.L ?? 0
          const V = stats.V ?? 0
          const I = stats.I ?? 0
          const M = stats.M ?? 0
          const A = stats.A ?? 0
          const F = stats.F ?? 0
          const C = stats.C ?? 0
          const H = stats.H ?? 0
          const P = stats.P ?? 0
          const R = stats.R ?? 0
          const K = stats.K ?? 0
          const Q = stats.Q ?? 0
          const E = stats.E ?? 0
          const D = stats.D ?? 0
          const T = stats.T ?? 0
          const S = stats.S ?? 0
          const G = stats.G ?? 0
          const Y = stats.Y ?? 0
          const N = stats.N ?? 0

          const WLVIMAFCHPY = W + L + V + I + M + A + F + C + H + P + Y
          const KR = K + R
          const QE = Q + E
          const ED = E + D
          const TS = T + S

          if (WLVIMAFCHPY / total > 0.6) {
            colors.W = 'rgb(128,179,230)'
            colors.L = 'rgb(128,179,230)'
            colors.V = 'rgb(128,179,230)'
            colors.A = 'rgb(128,179,230)'
            colors.I = 'rgb(128,179,230)'
            colors.M = 'rgb(128,179,230)'
            colors.F = 'rgb(128,179,230)'
            colors.C = 'rgb(128,179,230)'
          }

          if (
            KR / total > 0.6 ||
            K / total > 0.8 ||
            R / total > 0.8 ||
            Q / total > 0.8
          ) {
            colors.K = '#d88'
            colors.R = '#d88'
          }

          if (
            KR / total > 0.6 ||
            QE / total > 0.5 ||
            E / total > 0.8 ||
            Q / total > 0.8 ||
            D / total > 0.8
          ) {
            colors.E = 'rgb(192, 72, 192)'
          }

          if (
            KR / total > 0.6 ||
            ED / total > 0.5 ||
            K / total > 0.8 ||
            R / total > 0.8 ||
            Q / total > 0.8
          ) {
            colors.D = 'rgb(204, 77, 204)'
          }

          if (N / total > 0.5 || Y / total > 0.85) {
            colors.N = '#8f8'
          }

          if (
            KR / total > 0.6 ||
            QE / total > 0.6 ||
            Q / total > 0.85 ||
            E / total > 0.85 ||
            K / total > 0.85 ||
            R / total > 0.85
          ) {
            colors.Q = '#8f8'
          }

          if (
            WLVIMAFCHPY / total > 0.6 ||
            TS / total > 0.5 ||
            S / total > 0.85 ||
            T / total > 0.85
          ) {
            colors.S = 'rgb(26,204,26)'
            colors.T = 'rgb(26,204,26)'
          }

          if (C / total > 0.85) {
            colors.C = 'rgb(240, 128, 128)'
          }

          if (G / total > 0) {
            colors.G = 'rgb(240, 144, 72)'
          }

          if (P / total > 0) {
            colors.P = 'rgb(204, 204, 0)'
          }

          if (
            WLVIMAFCHPY / total > 0.6 ||
            W / total > 0.85 ||
            Y / total > 0.85 ||
            A / total > 0.85 ||
            C / total > 0.85 ||
            P / total > 0.85 ||
            Q / total > 0.85 ||
            F / total > 0.85 ||
            H / total > 0.85 ||
            I / total > 0.85 ||
            L / total > 0.85 ||
            M / total > 0.85 ||
            V / total > 0.85
          ) {
            colors.H = 'rgb(26, 179, 179)'
            colors.Y = 'rgb(26, 179, 179)'
          }

          return colors
        })
      },

      /**
       * #getter
       * Conservation score per column using Shannon entropy (biojs-msa style).
       * Conservation = (1 - H/Hmax) * (1 - gapFraction)
       * Returns values 0-1 where 1 = fully conserved, 0 = no conservation.
       */
      get conservation() {
        const { colStats, colStatsSums } = this
        const alphabetSize = 20
        const maxEntropy = Math.log2(alphabetSize)

        return colStats.map((stats, i) => {
          const total = colStatsSums[i]
          if (!total) {
            return 0
          }

          const gapCount = (stats['-'] || 0) + (stats['.'] || 0)
          const nonGapTotal = total - gapCount
          if (nonGapTotal === 0) {
            return 0
          }

          let entropy = 0
          for (const letter of Object.keys(stats)) {
            if (letter === '-' || letter === '.') {
              continue
            }
            const count = stats[letter]!
            const freq = count / nonGapTotal
            if (freq > 0) {
              entropy -= freq * Math.log2(freq)
            }
          }

          const gapFraction = gapCount / total
          const conservation = Math.max(0, 1 - entropy / maxEntropy)
          return conservation * (1 - gapFraction)
        })
      },
      /**
       * #getter
       * generates a new tree that is clustered with x,y positions
       */
      get hierarchy(): HierarchyNode<NodeWithIdsAndLength> {
        const r = this.root
        const clust = cluster<NodeWithIds>()
          .size([this.totalHeight, self.treeWidth])
          .separation(() => 1)
        clust(r)
        setBrLength(r, (r.data.length = 0), self.treeWidth / maxLength(r))
        return r as HierarchyNode<NodeWithIdsAndLength>
      },

      /**
       * #getter
       */
      get totalHeight() {
        return this.root.leaves().length * self.rowHeight
      },

      /**
       * #getter
       */
      get leaves() {
        return this.hierarchy.leaves()
      },

      /**
       * #getter
       */
      get allBranchesLength0() {
        return this.hierarchy.links().every(s => !s.source.data.length)
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
        return (self.data.msa || self.data.tree) && !self.error
      },
      /**
       * #getter
       */
      get blocksX() {
        return blocksX({
          viewportWidth: self.msaAreaWidth,
          viewportX: -self.scrollX,
          blockSize: self.blockSize,
          mapWidth: self.totalWidth,
        })
      },
      /**
       * #getter
       */
      get blocksY() {
        return blocksY({
          viewportHeight: self.height,
          viewportY: -self.scrollY,
          blockSize: self.blockSize,
          mapHeight: self.totalHeight,
        })
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get blocks2d() {
        const ret = []
        for (const by of self.blocksY) {
          for (const bx of self.blocksX) {
            ret.push([bx, by] as const)
          }
        }
        return ret
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
       */
      get showMsaLetters() {
        return (
          self.drawMsaLetters &&
          self.rowHeight >= 5 &&
          self.colWidth > self.rowHeight / 2
        )
      },
      /**
       * #getter
       */
      get showTreeText() {
        return self.drawLabels && self.rowHeight >= 5
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
       */
      resetZoom() {
        self.setColWidth(defaultColWidth)
        self.setRowHeight(defaultRowHeight)
      },
      /**
       * #action
       */
      zoomOutHorizontal() {
        self.colWidth = Math.max(1, Math.floor(self.colWidth * 0.75))
        self.scrollX = clamp(self.scrollX, self.maxScrollX, 0)
      },
      /**
       * #action
       */
      zoomInHorizontal() {
        self.colWidth = Math.ceil(self.colWidth * 1.5)
        self.scrollX = clamp(self.scrollX, self.maxScrollX, 0)
      },
      /**
       * #action
       */
      zoomInVertical() {
        self.rowHeight = Math.ceil(self.rowHeight * 1.5)
      },
      /**
       * #action
       */
      zoomOutVertical() {
        self.rowHeight = Math.max(1.5, Math.floor(self.rowHeight * 0.75))
      },
      /**
       * #action
       */
      zoomIn() {
        transaction(() => {
          self.colWidth = Math.ceil(self.colWidth * 1.5)
          self.rowHeight = Math.ceil(self.rowHeight * 1.5)
          self.scrollX = clamp(self.scrollX, self.maxScrollX, 0)
        })
      },
      /**
       * #action
       */
      zoomOut() {
        transaction(() => {
          self.colWidth = Math.max(1, Math.floor(self.colWidth * 0.75))
          self.rowHeight = Math.max(1.5, Math.floor(self.rowHeight * 0.75))
          self.scrollX = clamp(self.scrollX, self.maxScrollX, 0)
        })
      },
      /**
       * #action
       */
      setInterProAnnotations(data: Record<string, InterProScanResults>) {
        self.interProAnnotations = data
      },

      /**
       * #action
       */
      doScrollY(deltaY: number) {
        self.scrollY = clamp(self.scrollY + deltaY, -self.totalHeight + 10, 0)
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
        if (self.turnedOffTracks.has(id)) {
          self.turnedOffTracks.delete(id)
        } else {
          self.turnedOffTracks.set(id, true)
        }
      },
      /**
       * #action
       */
      setStatus(status?: { msg: string; url?: string }) {
        self.status = status
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get labelsWidth() {
        let x = 0
        const { rowHeight, leaves, treeMetadata, fontSize } = self
        if (rowHeight > 5) {
          for (const node of leaves) {
            x = Math.max(
              measureTextCanvas(
                treeMetadata[node.data.name]?.genome || node.data.name,
                fontSize,
              ),
              x,
            )
          }
        }
        return x
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
        return (
          MSA?.tracks
            .filter(t => t.data)
            .map(t => ({
              model: {
                ...t,
                data: hideGapsEffective ? skipBlanks(blanks, t.data) : t.data,
                height: rowHeight,
              } as TextTrackModel,
              ReactComponent: TextTrack,
            })) || []
        )
      },

      /**
       * #getter
       */
      get tracks(): BasicTrack[] {
        const conservationTrack: BasicTrack = {
          model: {
            id: 'conservation',
            name: 'Conservation',
            height: 40,
          },
          ReactComponent: ConservationTrack,
        }
        return [...this.adapterTrackModels, conservationTrack]
      },

      /**
       * #getter
       */
      get turnedOnTracks() {
        return this.tracks.filter(f => !self.turnedOffTracks.has(f.model.id))
      },

      /**
       * #getter
       */
      get showHorizontalScrollbar() {
        return self.msaAreaWidth < self.totalWidth
      },

      /**
       * #getter
       */
      get rowNamesSet() {
        return new Map(self.rowNames.map((r, idx) => [r, idx]))
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
        const { rowNames, rows } = self
        const index = rowNames.indexOf(rowName)
        return index !== -1 && rows[index]
          ? seqPosToGlobalCol({
              row: rows[index][1],
              seqPos,
            })
          : 0
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
       * #getter
       */
      get tidyInterProAnnotationTypes() {
        const types = new Map<string, Accession>()
        for (const annot of this.tidyInterProAnnotations) {
          types.set(annot.accession, annot)
        }
        return types
      },
      /**
       * #getter
       */
      get tidyInterProAnnotations() {
        const ret = []
        const { interProAnnotations } = self
        if (interProAnnotations) {
          for (const [id, val] of Object.entries(interProAnnotations)) {
            for (const { signature, locations } of val.matches) {
              const { entry } = signature
              if (entry) {
                const { name, accession, description } = entry
                for (const { start, end } of locations) {
                  ret.push({
                    id,
                    name,
                    accession,
                    description,
                    start,
                    end,
                  })
                }
              }
            }
          }
        }
        return ret.toSorted((a, b) => len(b) - len(a))
      },
      /**
       * #getter
       */
      get tidyFilteredInterProAnnotations() {
        return this.tidyInterProAnnotations.filter(r =>
          self.featureFilters.get(r.accession),
        )
      },
      /**
       * #getter
       */
      get tidyFilteredGatheredInterProAnnotations() {
        return groupBy(this.tidyFilteredInterProAnnotations, r => r.id)
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
       */
      get fillPalette() {
        const arr = [...self.tidyInterProAnnotationTypes.keys()]
        let i = 0
        const map = {} as Record<string, string>
        for (const key of arr) {
          const k = Math.min(arr.length - 1, palettes.length - 1)
          map[key] = palettes[k]![i]!
          i++
        }
        return map
      },
      /**
       * #getter
       */
      get strokePalette() {
        return Object.fromEntries(
          Object.entries(this.fillPalette).map(([key, val]) => [
            key,
            colord(val).darken(0.1).toHex(),
          ]),
        )
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
      reset() {
        self.setData({
          tree: '',
          msa: '',
        })
        self.resetZoom()
        self.setError(undefined)
        self.setScrollY(0)
        self.setScrollX(0)
        self.setCurrentAlignment(0)
        self.setTreeFilehandle(undefined)
        self.setMSAFilehandle(undefined)
      },
      /**
       * #action
       */
      async exportSVG(opts: {
        theme: Theme
        includeMinimap?: boolean
        includeTracks?: boolean
        exportType: string
      }) {
        const { renderToSvg } = await import('./renderToSvg')
        const html = await renderToSvg(self as MsaViewModel, opts)
        const blob = new Blob([html], { type: 'image/svg+xml' })
        saveAs(blob, 'image.svg')
      },
      /**
       * #action
       * internal, used for drawing to canvas
       */
      incrementRef() {
        self.nref++
      },

      /**
       * #action
       */
      initFilter(arg: string) {
        const ret = self.featureFilters.get(arg)
        if (ret === undefined) {
          self.featureFilters.set(arg, true)
        }
      },
      /**
       * #action
       */
      setFilter(arg: string, flag: boolean) {
        self.featureFilters.set(arg, flag)
      },
      /**
       * #action
       */
      fit() {
        self.rowHeight = self.msaAreaHeight / self.numRows
        self.colWidth = self.msaAreaWidth / self.numColumns
        self.scrollX = 0
        self.scrollY = 0
      },
      /**
       * #action
       */
      fitVertically() {
        self.rowHeight = self.msaAreaHeight / self.numRows
        self.scrollY = 0
      },
      /**
       * #action
       */
      fitHorizontally() {
        self.colWidth = self.msaAreaWidth / self.numColumns
        self.scrollX = 0
      },

      afterCreate() {
        addDisposer(
          self,
          autorun(() => {
            for (const key of self.tidyInterProAnnotationTypes.keys()) {
              this.initFilter(key)
            }
          }),
        )

        // autorun saves local settings
        addDisposer(
          self,
          autorun(() => {
            localStorageSetBoolean(showZoomStarKey, self.showZoomStar)
          }),
        )

        // autorun opens treeFilehandle
        addDisposer(
          self,
          autorun(async () => {
            const { treeFilehandle } = self
            if (treeFilehandle) {
              try {
                self.setLoadingTree(true)
                self.setTree(
                  await fetchAndMaybeUnzipText(openLocation(treeFilehandle)),
                )
                if (treeFilehandle.locationType === 'BlobLocation') {
                  // clear filehandle after loading if from a local file
                  self.setTreeFilehandle(undefined)
                }
              } catch (e) {
                console.error(e)
                self.setError(e)
              } finally {
                self.setLoadingTree(false)
              }
            }
          }),
        )
        // autorun opens treeMetadataFilehandle
        addDisposer(
          self,
          autorun(async () => {
            const { treeMetadataFilehandle } = self
            if (treeMetadataFilehandle) {
              try {
                self.setTreeMetadata(
                  await fetchAndMaybeUnzipText(
                    openLocation(treeMetadataFilehandle),
                  ),
                )
              } catch (e) {
                console.error(e)
                self.setError(e)
              }
            }
          }),
        )

        // autorun opens gffFilehandle for InterProScan domains
        addDisposer(
          self,
          autorun(async () => {
            const { gffFilehandle } = self
            if (gffFilehandle) {
              try {
                const gffText = await fetchAndMaybeUnzipText(
                  openLocation(gffFilehandle),
                )
                const gffRecords = parseGFF(gffText)
                const interProResults = gffToInterProResults(gffRecords)
                self.setInterProAnnotations(interProResults)
                self.setShowDomains(true)
                if (gffFilehandle.locationType === 'BlobLocation') {
                  self.setGFFFilehandle(undefined)
                }
              } catch (e) {
                console.error(e)
                self.setError(e)
              }
            }
          }),
        )

        // autorun opens msaFilehandle
        addDisposer(
          self,
          autorun(async () => {
            const { msaFilehandle } = self
            if (msaFilehandle) {
              try {
                self.setLoadingMSA(true)
                self.setError(undefined)
                const txt = await fetchAndMaybeUnzipText(
                  openLocation(msaFilehandle),
                )
                transaction(() => {
                  self.setMSA(txt)
                  if (msaFilehandle.locationType === 'BlobLocation') {
                    // clear filehandle after loading if from a local file
                    self.setMSAFilehandle(undefined)
                  }
                })
              } catch (e) {
                console.error(e)
                self.setError(e)
              } finally {
                self.setLoadingMSA(false)
              }
            }
          }),
        )

        // force colStats not to go stale
        // xref solution https://github.com/mobxjs/mobx/issues/266#issuecomment-222007278
        // xref problem https://github.com/GMOD/react-msaview/issues/75
        addDisposer(
          self,
          autorun(() => {
            if (self.colorSchemeName.includes('dynamic')) {
              // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
              self.colStats
              // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
              self.colStatsSums
            }
            // eslint-disable-next-line  @typescript-eslint/no-unused-expressions
            self.columns
          }),
        )

        // autorun synchronizes treeWidth with treeAreaWidth
        addDisposer(
          self,
          autorun(async () => {
            if (self.treeWidthMatchesArea) {
              self.setTreeWidth(
                Math.max(
                  50,
                  self.treeAreaWidth - self.labelsWidth - 10 - self.marginLeft,
                ),
              )
            }
          }),
        )
      },
    }))
    .postProcessSnapshot(result => {
      const snap = result as Omit<typeof result, symbol>
      const {
        data: { tree, msa, treeMetadata },
        // Main model properties
        showDomains,
        hideGaps,
        allowedGappyness,
        contrastLettering,
        subFeatureRows,
        drawMsaLetters,
        height,
        rowHeight,
        scrollY,
        scrollX,
        colWidth,
        currentAlignment,
        collapsed,
        collapsedLeaves,
        showOnly,
        turnedOffTracks,
        featureFilters,
        relativeTo,
        // MSA model properties
        bgColor,
        colorSchemeName,
        // Tree model properties
        drawLabels,
        labelsAlignRight,
        treeAreaWidth,
        treeWidth,
        treeWidthMatchesArea,
        showBranchLen,
        drawTree,
        drawNodeBubbles,
        // Always include
        ...rest
      } = snap

      // remove the MSA/tree data from the tree if the filehandle available in
      // which case it can be reloaded on refresh
      return {
        ...rest,
        data: {
          ...(result.treeFilehandle ? {} : { tree }),
          ...(result.msaFilehandle ? {} : { msa }),
          ...(result.treeMetadataFilehandle ? {} : { treeMetadata }),
        },
        // Main model - only include non-default values
        ...(showDomains !== defaultShowDomains ? { showDomains } : {}),
        ...(hideGaps !== defaultHideGaps ? { hideGaps } : {}),
        ...(allowedGappyness !== defaultAllowedGappyness
          ? { allowedGappyness }
          : {}),
        ...(contrastLettering !== defaultContrastLettering
          ? { contrastLettering }
          : {}),
        ...(subFeatureRows !== defaultSubFeatureRows ? { subFeatureRows } : {}),
        ...(drawMsaLetters !== defaultDrawMsaLetters ? { drawMsaLetters } : {}),
        ...(height !== defaultHeight ? { height } : {}),
        ...(rowHeight !== defaultRowHeight ? { rowHeight } : {}),
        ...(scrollY !== defaultScrollY ? { scrollY } : {}),
        ...(scrollX !== defaultScrollX ? { scrollX } : {}),
        ...(colWidth !== defaultColWidth ? { colWidth } : {}),
        ...(currentAlignment !== defaultCurrentAlignment
          ? { currentAlignment }
          : {}),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        ...(collapsed?.length ? { collapsed } : {}),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        ...(collapsedLeaves?.length ? { collapsedLeaves } : {}),
        ...(showOnly !== undefined ? { showOnly } : {}),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        ...(turnedOffTracks && Object.keys(turnedOffTracks).length > 0
          ? { turnedOffTracks }
          : {}),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        ...(featureFilters && Object.keys(featureFilters).length > 0
          ? { featureFilters }
          : {}),
        ...(relativeTo !== undefined ? { relativeTo } : {}),
        // MSA model - only include non-default values
        ...(bgColor !== defaultBgColor ? { bgColor } : {}),
        ...(colorSchemeName !== defaultColorSchemeName
          ? { colorSchemeName }
          : {}),
        // Tree model - only include non-default values
        ...(drawLabels !== defaultDrawLabels ? { drawLabels } : {}),
        ...(labelsAlignRight !== defaultLabelsAlignRight
          ? { labelsAlignRight }
          : {}),
        ...(treeAreaWidth !== defaultTreeAreaWidth ? { treeAreaWidth } : {}),
        ...(treeWidth !== defaultTreeWidth ? { treeWidth } : {}),
        ...(treeWidthMatchesArea !== defaultTreeWidthMatchesArea
          ? { treeWidthMatchesArea }
          : {}),
        ...(showBranchLen !== defaultShowBranchLen ? { showBranchLen } : {}),
        ...(drawTree !== defaultDrawTree ? { drawTree } : {}),
        ...(drawNodeBubbles !== defaultDrawNodeBubbles
          ? { drawNodeBubbles }
          : {}),
      } as typeof snap
    })
}

export default stateModelFactory

export type MsaViewStateModel = ReturnType<typeof stateModelFactory>
export type MsaViewModel = Instance<MsaViewStateModel>

import { clamp, groupBy, notEmpty, sum } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { ElementId, FileLocation } from '@jbrowse/core/util/types/mst'
import { addDisposer, cast, types } from '@jbrowse/mobx-state-tree'
import { colord } from 'colord'
import { autorun, transaction } from 'mobx'
import {
  generateNodeIds,
  gffToInterProResults,
  parseEmfTree,
  parseGFF,
  parseMSA,
  parseNewick,
} from 'msa-parsers'

import { calculateBlocks } from './calculateBlocks.ts'
import { clustalXColumnColors } from './clustalX.ts'
import colorSchemes from './colorSchemes.ts'
import ConservationTrack from './components/ConservationTrack.tsx'
import TextTrack from './components/TextTrack.tsx'
import {
  defaultAllowedGappyness,
  defaultBgColor,
  defaultColWidth,
  defaultColorSchemeName,
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
  defaultScrollZoom,
  defaultShowBranchLen,
  defaultShowDomains,
  defaultSubFeatureRows,
  defaultTreeAreaWidth,
  defaultTreeWidth,
  maxCellSize,
  minColWidth,
  minRowHeight,
} from './constants.ts'
import { createPaletteMap } from './createPaletteMap.ts'
import { fetchTextWithProgress, isAbortError } from './fetchUtils.ts'
import { flatToTree } from './flatToTree.ts'
import {
  calcDepthToLeaf,
  clusterLayout,
  collapse,
  collapsedSubtreeLengthExtent,
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
import {
  globalColToVisibleCol,
  visibleColToGlobalCol,
  visibleColToSeqPosForRow,
} from './rowCoordinateCalculations.ts'
import { seqPosToGlobalCol } from './seqPosToGlobalCol.ts'
import { computeRowInsertions, len, skipBlanks, transform } from './util.ts'
import { saveAs } from './vendor/fileSaver.ts'

import type { HierarchyNode } from './hierarchy.ts'
import type { InterProScanResults } from './launchInterProScan.ts'
import type { BasicTrack, NodeWithIds, NodeWithIdsAndLength } from './types.ts'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { Instance } from '@jbrowse/mobx-state-tree'
import type { Theme } from '@mui/material'

function parseTreeText(text: string) {
  if (text.startsWith('BioTreeContainer')) {
    return flatToTree(parseAsn1(text))
  }
  return parseNewick(text.startsWith('SEQ') ? parseEmfTree(text).tree : text)
}

/**
 * #stateModel MsaView
 *
 * The main MSAView state model. Holds the loaded alignment, tree, and optional
 * InterProScan domain annotations, plus all display state (color scheme, zoom,
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
         * zoom in/out on plain mouse-wheel without holding ctrl
         */
        scrollZoom: defaultScrollZoom,

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
       */
      marginLeft: 20,

      /**
       * #volatile
       */
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      error: undefined as unknown,

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
       * toggle the InterProScan protein-domain overlay on the alignment
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
        return self.showDomains && !!self.interProAnnotations
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
        return !self.interProAnnotations
      },
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
        const r: Record<string, number>[] = []
        const columns = this.columns2d
        for (const column of columns) {
          for (let j = 0; j < column.length; j++) {
            const l = (r[j] ??= {})
            const cj = column[j]!
            l[cj] = (l[cj] ?? 0) + 1
          }
        }
        return r
      },

      /**
       * #getter
       */
      get colStatsSums() {
        return this.colStats.map(col => sum(Object.values(col)))
      },

      /**
       * #getter
       * Detects sequence type based on letters present in the alignment.
       * Returns 'dna', 'rna', or 'amino'.
       */
      get sequenceType(): 'dna' | 'rna' | 'amino' {
        const letters = new Set<string>()
        for (const stats of this.colStats) {
          for (const letter of Object.keys(stats)) {
            if (letter !== '-' && letter !== '.') {
              letters.add(letter)
            }
          }
        }
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
        const { colStats, colStatsSums } = this
        return colStats.map((stats, i) => {
          const total = colStatsSums[i]
          if (!total) {
            return { letter: '', color: undefined }
          }
          let maxCount = 0
          let letter = ''
          for (const [key, val] of Object.entries(stats)) {
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
        return colStats.map((stats, i) =>
          clustalXColumnColors(stats, colStatsSums[i]!),
        )
      },

      /**
       * #getter
       * Conservation score per column using Shannon entropy (biojs-msa style).
       * Conservation = (1 - H/Hmax) * (1 - gapFraction)
       * Returns values 0-1 where 1 = fully conserved, 0 = no conservation.
       */
      get conservation() {
        const { colStats, colStatsSums, sequenceType } = this
        const alphabetSize = sequenceType === 'amino' ? 20 : 4
        const maxEntropy = Math.log2(alphabetSize)

        return colStats.map((stats, i) => {
          const total = colStatsSums[i]
          if (!total) {
            return 0
          }

          const gapCount = (stats['-'] ?? 0) + (stats['.'] ?? 0)
          const nonGapTotal = total - gapCount
          if (nonGapTotal === 0) {
            return 0
          }

          let entropy = 0
          for (const [letter, count] of Object.entries(stats)) {
            if (letter !== '-' && letter !== '.') {
              const freq = count / nonGapTotal
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
        clusterLayout(r, this.totalHeight, self.treeWidth)
        r.data.length = 0
        const max = maxLength(r)
        const k = max ? self.treeWidth / max : 0
        setBrLength(r, 0, k)
        // for each collapsed clade, record the pixel x-positions of its
        // nearest/farthest tips so the renderer can draw a triangle that spans
        // the branch-length extent of the hidden subtree
        forEachDescendant(r, node => {
          if (node._children) {
            const { min, max: mx } = collapsedSubtreeLengthExtent(node)
            node.collapsedTipXNear = (node.len ?? 0) + min * k
            node.collapsedTipXFar = (node.len ?? 0) + mx * k
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
        return (self.data.msa !== '' || self.data.tree !== '') && !self.error
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
          viewportSize: self.height,
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
       * letting the whole alignment scroll off the top. visible MSA height is
       * computed inline here because msaAreaHeight is defined later in the chain.
       */
      get maxScrollY() {
        const visibleHeight =
          self.height -
          self.headerHeight -
          (self.msaAreaWidth < self.totalWidth ? self.minimapHeight : 0)
        return Math.min(-self.totalHeight + visibleHeight, 0)
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
       */
      setScrollZoom(arg: boolean) {
        self.scrollZoom = arg
      },

      /**
       * #action
       * set hovered tree node and its descendants
       */
      setHoveredTreeNode(nodeId?: string) {
        if (nodeId) {
          const node = find(self.hierarchy, n => n.data.id === nodeId)
          self.hoveredTreeNode = node
            ? {
                nodeId,
                descendantNames: leaves(node).map(leaf => leaf.data.name),
              }
            : undefined
        } else {
          self.hoveredTreeNode = undefined
        }
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
        self.scrollY = clamp(self.scrollY + deltaY, self.maxScrollY, 0)
      },

      /**
       * #action
       * Set domain annotations and reveal the overlay in a single step (or clear
       * both when passed undefined). Shared by every domain source: InterProScan,
       * GFF, user-provided uploads, and NCBI CDD.
       */
      setDomains(data?: Record<string, InterProScanResults>) {
        self.interProAnnotations = data
        self.setShowDomains(!!data)
      },

      applyGFFText(gffText: string) {
        const gffRecords = parseGFF(gffText)
        this.setDomains(gffToInterProResults(gffRecords))
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
      setStatus(status?: { msg: string; url?: string; onCancel?: () => void }) {
        self.status = status
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get labelWidthMap() {
        const { rowHeight, leaves, treeMetadata, fontSize } = self
        return rowHeight <= 5
          ? new Map<string, number>()
          : new Map(
              leaves.map(node => {
                const { name } = node.data
                const displayName = treeMetadata[name]?.genome ?? name
                return [name, measureTextCanvas(displayName, fontSize)] as const
              }),
            )
      },

      get labelsWidth() {
        const widths = this.labelWidthMap
        return widths.size === 0 ? 0 : Math.max(...widths.values())
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
              data: hideGapsEffective ? skipBlanks(blanks, t.data!) : t.data,
              height: rowHeight,
            },
            ReactComponent: TextTrack,
          }))
      },

      /**
       * #getter
       */
      get tracks(): BasicTrack[] {
        const conservationTrack: BasicTrack = {
          model: {
            id: 'conservation',
            name: 'Conservation',
            height: self.conservationTrackHeight,
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
        return seq ? seqPosToGlobalCol({ row: seq, seqPos }) : 0
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
      get tidyInterProAnnotationTypes() {
        return new Map(
          this.tidyInterProAnnotations.map(annot => [annot.accession, annot]),
        )
      },
      get tidyInterProAnnotations() {
        return self.interProAnnotations
          ? Object.entries(self.interProAnnotations)
              .flatMap(([id, val]) =>
                val.matches.flatMap(({ signature, locations }) => {
                  const { entry } = signature
                  return entry
                    ? locations.map(({ start, end }) => ({
                        id,
                        name: entry.name,
                        accession: entry.accession,
                        description: entry.description,
                        start,
                        end,
                      }))
                    : []
                }),
              )
              .toSorted((a, b) => len(b) - len(a))
          : []
      },
      get tidyFilteredInterProAnnotations() {
        return this.tidyInterProAnnotations.filter(r =>
          self.featureFilters.get(r.accession),
        )
      },
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
      get fillPalette() {
        return createPaletteMap([...self.tidyInterProAnnotationTypes.keys()])
      },
      get strokePalette() {
        return transform(this.fillPalette, ([key, val]) => [
          key,
          colord(val).darken(0.1).toHex(),
        ])
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
        self.setGFFFilehandle(undefined)
        self.setDomains(undefined)
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
          self.colWidth = clamp(
            self.msaAreaWidth / self.numColumns,
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
            for (const key of self.tidyInterProAnnotationTypes.keys()) {
              this.initFilter(key)
            }
          }),
        )

        // autorun opens treeFilehandle. generation guard: if the filehandle
        // changes mid-fetch, a slower earlier request must not clobber the data
        // (or loading flag) set by the newer one
        let treeGeneration = 0
        addDisposer(
          self,
          autorun(async () => {
            const { treeFilehandle } = self
            if (treeFilehandle) {
              const generation = ++treeGeneration
              try {
                self.setLoadingTree(true)
                const text = await fetchTextWithProgress(
                  openLocation(treeFilehandle),
                  status => {
                    if (generation === treeGeneration) {
                      self.setStatus(status)
                    }
                  },
                )
                if (generation === treeGeneration) {
                  transaction(() => {
                    self.setTree(text)
                    if (treeFilehandle.locationType === 'BlobLocation') {
                      // clear filehandle after loading if from a local file
                      self.setTreeFilehandle(undefined)
                    }
                  })
                }
              } catch (e) {
                if (generation === treeGeneration) {
                  if (isAbortError(e)) {
                    // cancelled by the user: drop the filehandle so the view
                    // returns to the import form instead of a stuck spinner
                    self.setTreeFilehandle(undefined)
                  } else {
                    console.error(e)
                    self.setError(e)
                  }
                }
              } finally {
                if (generation === treeGeneration) {
                  self.setLoadingTree(false)
                }
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
                  await fetchTextWithProgress(
                    openLocation(treeMetadataFilehandle),
                    status => {
                      self.setStatus(status)
                    },
                  ),
                )
              } catch (e) {
                // ignore user cancel (isAbortError); treeMetadata is optional
                if (!isAbortError(e)) {
                  console.error(e)
                  self.setError(e)
                }
              }
            }
          }),
        )

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

        // autorun opens gffFilehandle for InterProScan domains
        addDisposer(
          self,
          autorun(async () => {
            const { gffFilehandle } = self
            if (gffFilehandle) {
              try {
                const gffText = await fetchTextWithProgress(
                  openLocation(gffFilehandle),
                  status => {
                    self.setStatus(status)
                  },
                )
                self.applyGFFText(gffText)
                if (gffFilehandle.locationType === 'BlobLocation') {
                  self.setGFFFilehandle(undefined)
                }
              } catch (e) {
                // on user cancel (isAbortError) drop the filehandle
                if (isAbortError(e)) {
                  self.setGFFFilehandle(undefined)
                } else {
                  console.error(e)
                  self.setError(e)
                }
              }
            }
          }),
        )

        // autorun opens msaFilehandle. generation guard: see treeFilehandle
        let msaGeneration = 0
        addDisposer(
          self,
          autorun(async () => {
            const { msaFilehandle } = self
            if (msaFilehandle) {
              const generation = ++msaGeneration
              try {
                self.setLoadingMSA(true)
                self.setError(undefined)
                const txt = await fetchTextWithProgress(
                  openLocation(msaFilehandle),
                  status => {
                    if (generation === msaGeneration) {
                      self.setStatus(status)
                    }
                  },
                )
                if (generation === msaGeneration) {
                  transaction(() => {
                    self.setMSA(txt)
                    if (msaFilehandle.locationType === 'BlobLocation') {
                      // clear filehandle after loading if from a local file
                      self.setMSAFilehandle(undefined)
                    }
                  })
                }
              } catch (e) {
                if (generation === msaGeneration) {
                  if (isAbortError(e)) {
                    // cancelled by the user: drop the filehandle so the view
                    // returns to the import form instead of a stuck spinner
                    self.setMSAFilehandle(undefined)
                  } else {
                    console.error(e)
                    self.setError(e)
                  }
                }
              } finally {
                if (generation === msaGeneration) {
                  self.setLoadingMSA(false)
                }
              }
            }
          }),
        )

        // Keep the parse chain warm: reading self.columns transitively holds
        // self.MSA (parseMSA) computed alive, so it is parsed once per data
        // change rather than re-parsed on every non-reactive access. colStats is
        // additionally held for dynamic color schemes. Do not remove.
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
    .postProcessSnapshot(result => {
      const snap = result as Omit<typeof result, symbol>
      const {
        data: { tree, msa, treeMetadata },
        // Main model properties
        showDomains,
        hideGaps,
        allowedGappyness,
        subFeatureRows,
        drawMsaLetters,
        height,
        rowHeight,
        scrollY,
        scrollX,
        colWidth,
        currentAlignment,
        collapsed,
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
        showBranchLen,
        drawTree,
        drawNodeBubbles,
        // Always include
        ...rest
      } = snap

      const defaults: Record<string, unknown> = {
        showDomains: defaultShowDomains,
        hideGaps: defaultHideGaps,
        allowedGappyness: defaultAllowedGappyness,
        subFeatureRows: defaultSubFeatureRows,
        drawMsaLetters: defaultDrawMsaLetters,
        height: defaultHeight,
        rowHeight: defaultRowHeight,
        scrollY: defaultScrollY,
        scrollX: defaultScrollX,
        colWidth: defaultColWidth,
        currentAlignment: defaultCurrentAlignment,
        bgColor: defaultBgColor,
        colorSchemeName: defaultColorSchemeName,
        drawLabels: defaultDrawLabels,
        labelsAlignRight: defaultLabelsAlignRight,
        treeAreaWidth: defaultTreeAreaWidth,
        treeWidth: defaultTreeWidth,
        showBranchLen: defaultShowBranchLen,
        drawTree: defaultDrawTree,
        drawNodeBubbles: defaultDrawNodeBubbles,
      }

      const nonDefaults = Object.fromEntries(
        Object.entries(defaults)
          .filter(([key, def]) => snap[key as keyof typeof snap] !== def)
          .map(([key]) => [key, snap[key as keyof typeof snap]]),
      )

      return {
        ...rest,
        data: {
          ...(result.treeFilehandle ? {} : { tree }),
          ...(result.msaFilehandle ? {} : { msa }),
          ...(result.treeMetadataFilehandle ? {} : { treeMetadata }),
        },
        ...nonDefaults,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        ...(collapsed?.length ? { collapsed } : {}),
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
      } as typeof snap
    })
}

export default stateModelFactory

export type MsaViewStateModel = ReturnType<typeof stateModelFactory>
export type MsaViewModel = Instance<MsaViewStateModel>

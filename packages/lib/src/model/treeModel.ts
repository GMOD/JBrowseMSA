import { types } from '@jbrowse/mobx-state-tree'

import {
  defaultDrawLabels,
  defaultDrawNodeBubbles,
  defaultDrawNodeLabels,
  defaultDrawTree,
  defaultLabelsAlignRight,
  defaultOverviewHeight,
  defaultShowBranchLen,
  defaultTreeOrder,
  defaultShowTreeOverview,
  defaultTreeAreaWidth,
  defaultTreeWidth,
  treeOrders,
} from '../constants.ts'
import { stripDefault } from '../stripDefault.ts'

import type { TreeOrder } from '../types.ts'

/**
 * #stateModel Tree
 */
export function TreeModelF() {
  return types
    .model({
      /**
       * #property
       */
      drawLabels: stripDefault(types.boolean, defaultDrawLabels),
      /**
       * #property
       * right-align the labels
       */
      labelsAlignRight: stripDefault(types.boolean, defaultLabelsAlignRight),

      /**
       * #property
       * width of the area the tree is drawn in, px
       */
      treeAreaWidth: stripDefault(types.number, defaultTreeAreaWidth),

      /**
       * #property
       * width of the tree within the treeArea, px. automatically synced to
       * fit within treeAreaWidth
       */
      treeWidth: stripDefault(types.number, defaultTreeWidth),

      /**
       * #property
       * use "branch length" e.g. evolutionary distance to draw tree branch
       * lengths. if false, the layout is a "cladogram" that does not take into
       * account evolutionary distances
       */
      showBranchLen: stripDefault(types.boolean, defaultShowBranchLen),

      /**
       * #property
       * the order each node's children draw in: `branchLength` (shortest
       * first), `input` (as the file gives them), `ladderize` (fewest tips
       * first) or `ladderizeReverse` (most tips first)
       */
      treeOrder: stripDefault(
        types.enumeration<TreeOrder>('TreeOrder', [...treeOrders]),
        defaultTreeOrder,
      ),

      /**
       * #property
       * draw tree, boolean
       */
      drawTree: stripDefault(types.boolean, defaultDrawTree),

      /**
       * #property
       * draw node bubbles on the tree; the branches stay clickable either way
       */
      drawNodeBubbles: stripDefault(types.boolean, defaultDrawNodeBubbles),

      /**
       * #property
       * draw the label a newick file gives an internal node, which is where a
       * bootstrap or posterior support value lands
       */
      drawNodeLabels: stripDefault(types.boolean, defaultDrawNodeLabels),

      /**
       * #property
       * draw the whole tree small above the tree panel, with the focused
       * subtree boxed. A click on it focuses the subtree under the pointer
       */
      showTreeOverview: stripDefault(types.boolean, defaultShowTreeOverview),

      /**
       * #property
       * height of the tree overview band, px
       */
      overviewHeight: stripDefault(types.number, defaultOverviewHeight),

      /**
       * #property
       * auto-size treeAreaWidth to fit the row labels (plus the tree, if drawn)
       * instead of using a fixed width. useful when there is no tree, so the
       * label gutter isn't padded out to the default 400px
       */
      autoTreeAreaWidth: stripDefault(types.boolean, false),
    })
    .actions(self => ({
      /**
       * #action
       * set tree area width (px)
       */
      setTreeAreaWidth(n: number) {
        self.treeAreaWidth = Math.round(n)
      },
      /**
       * #action
       * set tree width (px)
       */
      setTreeWidth(n: number) {
        self.treeWidth = Math.round(n)
      },

      /**
       * #action
       */
      setLabelsAlignRight(arg: boolean) {
        self.labelsAlignRight = arg
      },
      /**
       * #action
       */
      setDrawTree(arg: boolean) {
        self.drawTree = arg
      },
      /**
       * #action
       */
      setAutoTreeAreaWidth(arg: boolean) {
        self.autoTreeAreaWidth = arg
      },

      /**
       * #action
       */
      setShowBranchLen(arg: boolean) {
        self.showBranchLen = arg
      },

      /**
       * #action
       */
      setTreeOrder(order: TreeOrder) {
        self.treeOrder = order
      },

      /**
       * #action
       */
      setDrawNodeBubbles(arg: boolean) {
        self.drawNodeBubbles = arg
      },
      /**
       * #action
       */
      setDrawNodeLabels(arg: boolean) {
        self.drawNodeLabels = arg
      },
      /**
       * #action
       */
      setShowTreeOverview(arg: boolean) {
        self.showTreeOverview = arg
      },
      /**
       * #action
       * set the height of the tree overview band (px)
       */
      setOverviewHeight(n: number) {
        self.overviewHeight = Math.round(n)
      },
      /**
       * #action
       */
      setDrawLabels(arg: boolean) {
        self.drawLabels = arg
      },
    }))
}

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
  treeOrders,
} from '../constants.ts'
import { stripDefault } from '../stripDefault.ts'

import type { TreeOrder } from '../types.ts'

/**
 * #stateModel Tree
 */
export function TreeModelF(defaults: { labelsAlignRight?: boolean } = {}) {
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
      labelsAlignRight: stripDefault(
        types.boolean,
        defaults.labelsAlignRight ?? defaultLabelsAlignRight,
      ),

      /**
       * #property
       * width of the area the tree and its labels draw in, px. Undefined fits
       * the area to the labels and the tree; `effectiveTreeAreaWidth` reads
       * the width either way
       */
      treeAreaWidth: types.maybe(types.number),

      /**
       * #property
       * width of the tree within the tree area, px. Undefined gives the tree
       * the area less the labels; `effectiveTreeWidth` reads the width either
       * way
       */
      treeWidth: types.maybe(types.number),

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
    })
    .actions(self => ({
      /**
       * #action
       * set the tree area width, px, or undefined to fit it to the labels and
       * the tree. The tree then fills the area less the labels
       */
      setTreeAreaWidth(n: number | undefined) {
        self.treeAreaWidth = n === undefined ? undefined : Math.round(n)
        self.treeWidth = undefined
      },
      /**
       * #action
       * set the tree width, px, or undefined to fill the tree area less the
       * labels
       */
      setTreeWidth(n: number | undefined) {
        self.treeWidth = n === undefined ? undefined : Math.round(n)
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
       */
      setDrawLabels(arg: boolean) {
        self.drawLabels = arg
      },
    }))
}

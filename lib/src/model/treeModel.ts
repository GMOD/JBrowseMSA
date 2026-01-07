import { types } from 'mobx-state-tree'

import {
  defaultDrawLabels,
  defaultDrawNodeBubbles,
  defaultDrawTree,
  defaultLabelsAlignRight,
  defaultShowBranchLen,
  defaultTreeAreaWidth,
  defaultTreeWidth,
  defaultTreeWidthMatchesArea,
} from '../constants'

/**
 * #stateModel Tree
 */
function x() {} // eslint-disable-line @typescript-eslint/no-unused-vars

export function TreeModelF() {
  return types
    .model({
      /**
       * #property
       */
      drawLabels: defaultDrawLabels,
      /**
       * #property
       * right-align the labels
       */
      labelsAlignRight: defaultLabelsAlignRight,

      /**
       * #property
       * width of the area the tree is drawn in, px
       */
      treeAreaWidth: types.optional(types.number, defaultTreeAreaWidth),

      /**
       * #property
       * width of the tree within the treeArea, px
       */
      treeWidth: types.optional(types.number, defaultTreeWidth),

      /**
       * #getter
       * synchronization that matches treeWidth to treeAreaWidth
       */
      treeWidthMatchesArea: defaultTreeWidthMatchesArea,

      /**
       * #property
       * use "branch length" e.g. evolutionary distance to draw tree branch
       * lengths. if false, the layout is a "cladogram" that does not take into
       * account evolutionary distances
       */
      showBranchLen: defaultShowBranchLen,

      /**
       * #property
       * draw tree, boolean
       */
      drawTree: defaultDrawTree,

      /**
       * #property
       * draw clickable node bubbles on the tree
       */
      drawNodeBubbles: defaultDrawNodeBubbles,
    })
    .actions(self => ({
      /**
       * #action
       * synchronize the treewidth and treeareawidth
       */
      setTreeWidthMatchesArea(arg: boolean) {
        self.treeWidthMatchesArea = arg
      },

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
      setShowBranchLen(arg: boolean) {
        self.showBranchLen = arg
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
      setDrawLabels(arg: boolean) {
        self.drawLabels = arg
      },
    }))
}

import { types } from '@jbrowse/mobx-state-tree'

import {
  defaultDrawLabels,
  defaultDrawNodeBubbles,
  defaultDrawTree,
  defaultLabelsAlignRight,
  defaultShowBranchLen,
  defaultTreeAreaWidth,
  defaultTreeWidth,
} from '../constants.ts'
import { stripDefault } from '../stripDefault.ts'

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

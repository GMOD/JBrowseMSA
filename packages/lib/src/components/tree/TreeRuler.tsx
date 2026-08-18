import React from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

// The gutter above the tree panel. It spans the resize handle too, so whatever
// follows it in the top row starts exactly where the alignment canvas does --
// MainArea has TreePanel + VerticalResizeHandle before the alignment.
const TreeRuler = observer(({ model }: { model: MsaViewModel }) => {
  const { treeAreaWidth, resizeHandleWidth } = model
  return (
    <div style={{ flexShrink: 0, width: treeAreaWidth + resizeHandleWidth }} />
  )
})

export default TreeRuler

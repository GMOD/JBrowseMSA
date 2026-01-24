import React from 'react'

import { observer } from 'mobx-react'

import TreeCanvas from './TreeCanvas.tsx'

import type { MsaViewModel } from '../../model.ts'

const TreePanel = observer(function ({ model }: { model: MsaViewModel }) {
  const { treeAreaWidth } = model
  return (
    <div style={{ overflow: 'hidden', flexShrink: 0, width: treeAreaWidth }}>
      <TreeCanvas model={model} />
    </div>
  )
})

export default TreePanel

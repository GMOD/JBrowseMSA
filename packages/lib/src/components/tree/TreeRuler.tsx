import React from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const TreeRuler = observer(({ model }: { model: MsaViewModel }) => {
  const { treeAreaWidth } = model
  return <div style={{ flexShrink: 0, width: treeAreaWidth }} />
})

export default TreeRuler

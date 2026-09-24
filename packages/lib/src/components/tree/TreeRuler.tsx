import React from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { treeScaleBarHeight as h } from '../../constants.ts'
import ScaleBarSVG from './ScaleBarSVG.tsx'

import type { MsaViewModel } from '../../model.ts'

// The gutter above the tree panel, the width of the tree area, so the strip
// headers beside it start where the strips do. A phylogram fills it with a
// scale bar: without one the branch lengths are drawn to a scale nothing
// states.
const TreeRuler = observer(({ model }: { model: MsaViewModel }) => {
  const { treeAreaWidth, marginLeft, treeScaleBar: bar } = model
  const theme = useTheme()

  return (
    <div style={{ flexShrink: 0, width: treeAreaWidth }}>
      {bar ? (
        <svg width={treeAreaWidth} height={h} style={{ display: 'block' }}>
          <ScaleBarSVG
            bar={bar}
            marginLeft={marginLeft}
            y={h}
            color={theme.palette.text.primary}
          />
        </svg>
      ) : null}
    </div>
  )
})

export default TreeRuler

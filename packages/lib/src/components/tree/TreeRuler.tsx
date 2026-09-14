import React from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { scaleBarLength } from './scaleBar.ts'

import type { MsaViewModel } from '../../model.ts'

const BAR_HEIGHT = 22

// The gutter above the tree panel. It spans the resize handle too, so whatever
// follows it in the top row starts exactly where the alignment canvas does --
// MainArea has TreePanel + VerticalResizeHandle before the alignment. A
// phylogram fills it with a scale bar: without one the branch lengths are drawn
// to a scale nothing states.
const TreeRuler = observer(({ model }: { model: MsaViewModel }) => {
  const { treeAreaWidth, resizeHandleWidth, marginLeft, pxPerBranchLength } =
    model
  const theme = useTheme()
  const width = treeAreaWidth + resizeHandleWidth
  const bar = scaleBarLength(pxPerBranchLength, treeAreaWidth - marginLeft * 2)

  return (
    <div style={{ flexShrink: 0, width }}>
      {bar ? (
        <svg
          width={width}
          height={BAR_HEIGHT}
          style={{ display: 'block' }}
          color={theme.palette.text.primary}
        >
          <text
            x={marginLeft}
            y={BAR_HEIGHT - 9}
            fontSize={10}
            fill="currentColor"
          >
            {bar.label}
          </text>
          <path
            d={`M${marginLeft} ${BAR_HEIGHT - 7} v6 h${bar.px} v-6`}
            fill="none"
            stroke="currentColor"
          />
        </svg>
      ) : null}
    </div>
  )
})

export default TreeRuler

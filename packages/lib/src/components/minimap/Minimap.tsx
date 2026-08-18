import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import ScrollbarThumb, { scrollbarThumbFill } from '../ScrollbarThumb.tsx'
import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

import type { MsaViewModel } from '../../model.ts'

const Minimap = observer(function ({ model }: { model: MsaViewModel }) {
  const { minimapHeight, msaCanvasWidth } = model
  const { unit, s, w, polygonHeight, polygonPoints } = getMinimapLayout(
    model,
    msaCanvasWidth,
  )

  const onDrag = useCallback(
    (delta: number, startScroll: number) => {
      model.setScrollX(startScroll - delta / unit)
    },
    [model, unit],
  )

  return (
    // sized and placed to match the alignment canvas exactly: a minimap that
    // spans a different width than the columns it maps puts its viewport
    // rectangle over the wrong ones
    <div
      style={{
        position: 'relative',
        height: minimapHeight,
        width: msaCanvasWidth,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: MINIMAP_BAR_HEIGHT,
          boxSizing: 'border-box',
          border: '1px solid #555',
        }}
      />
      <ScrollbarThumb
        axis="x"
        getStart={() => model.scrollX}
        onDrag={onDrag}
        style={{
          top: 0,
          left: Math.max(0, s),
          height: MINIMAP_BAR_HEIGHT,
          width: w,
        }}
      />

      <svg height={polygonHeight} width={msaCanvasWidth}>
        <polygon fill={scrollbarThumbFill} points={polygonPoints} />
      </svg>
    </div>
  )
})

export default Minimap

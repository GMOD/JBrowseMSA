import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import ScrollbarThumb, { scrollbarThumbFill } from '../ScrollbarThumb.tsx'
import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

import type { MsaViewModel } from '../../model.ts'

const Minimap = observer(function ({ model }: { model: MsaViewModel }) {
  const { minimapHeight } = model
  const { unit, s, w, polygonHeight, polygonPoints } = getMinimapLayout(model)

  const onDrag = useCallback(
    (delta: number, startScroll: number) => {
      model.setScrollX(startScroll - delta / unit)
    },
    [model, unit],
  )

  return (
    <div
      style={{
        position: 'relative',
        height: minimapHeight,
        width: '100%',
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

      <svg height={polygonHeight} style={{ width: '100%' }}>
        <polygon fill={scrollbarThumbFill} points={polygonPoints} />
      </svg>
    </div>
  )
})

export default Minimap

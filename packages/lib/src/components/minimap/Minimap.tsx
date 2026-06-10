import React, { useCallback, useState } from 'react'

import { observer } from 'mobx-react'

import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'
import { useDragScroll } from '../../useDragScroll.ts'

import type { MsaViewModel } from '../../model.ts'

const Minimap = observer(function ({ model }: { model: MsaViewModel }) {
  const [hovered, setHovered] = useState(false)
  const { minimapHeight } = model
  const { unit, s, w, polygonHeight, polygonPoints } = getMinimapLayout(model)
  const fill = 'rgba(66, 119, 127, 0.3)'

  const { startDrag } = useDragScroll(
    'x',
    useCallback(
      (delta: number, startScroll: number) => {
        model.setScrollX(startScroll - delta / unit)
      },
      [model, unit],
    ),
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
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: Math.max(0, s),
          background: hovered ? 'rgba(66,119,127,0.6)' : fill,
          cursor: 'pointer',
          height: MINIMAP_BAR_HEIGHT,
          width: w,
          zIndex: 100,
        }}
        onMouseOver={() => {
          setHovered(true)
        }}
        onMouseOut={() => {
          setHovered(false)
        }}
        onMouseDown={event => {
          startDrag(event, model.scrollX)
        }}
      />

      <svg height={polygonHeight} style={{ width: '100%' }}>
        <polygon fill={fill} points={polygonPoints} />
      </svg>
    </div>
  )
})

export default Minimap

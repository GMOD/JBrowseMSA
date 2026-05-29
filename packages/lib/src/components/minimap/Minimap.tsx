import React, { useCallback, useState } from 'react'

import { observer } from 'mobx-react'

import { useDragScroll } from '../../useDragScroll.ts'

import type { MsaViewModel } from '../../model.ts'

const Minimap = observer(function ({ model }: { model: MsaViewModel }) {
  const [hovered, setHovered] = useState(false)
  const { scrollX, msaAreaWidth, minimapHeight, colWidth, numColumns } = model
  const unit = msaAreaWidth / numColumns / colWidth
  const left = -scrollX
  const right = left + msaAreaWidth
  const s = left * unit
  const e = right * unit
  const fill = 'rgba(66, 119, 127, 0.3)'
  const w = Math.max(e - s, 20)

  const { startDrag } = useDragScroll(
    'x',
    useCallback(
      (delta: number, startScroll: number) => {
        model.setScrollX(startScroll - delta / unit)
      },
      [model, unit],
    ),
  )

  const barHeight = 12
  const polygonHeight = minimapHeight - barHeight
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
          height: barHeight,
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
          height: barHeight,
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
        <polygon
          fill={fill}
          points={[
            [s + w, 0],
            [s, 0],
            [0, polygonHeight],
            [msaAreaWidth, polygonHeight],
          ].toString()}
        />
      </svg>
    </div>
  )
})

export default Minimap

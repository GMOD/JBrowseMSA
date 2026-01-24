import React, { useEffect, useRef, useState } from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

interface ClickCoord {
  clientX: number
  scrollX: number
}

const Minimap = observer(function ({ model }: { model: MsaViewModel }) {
  const [mouseDown, setMouseDown] = useState<ClickCoord>()
  const [hovered, setHovered] = useState(false)
  const scheduled = useRef(false)
  const { scrollX, msaAreaWidth, minimapHeight, colWidth, numColumns } = model
  const unit = msaAreaWidth / numColumns / colWidth
  const left = -scrollX
  const right = left + msaAreaWidth
  const s = left * unit
  const e = right * unit
  const fill = 'rgba(66, 119, 127, 0.3)'
  const w = Math.max(e - s, 20)

  useEffect(() => {
    function fn(event: MouseEvent) {
      if (mouseDown !== undefined) {
        if (!scheduled.current) {
          scheduled.current = true
          window.requestAnimationFrame(() => {
            model.setScrollX(
              mouseDown.scrollX - (event.clientX - mouseDown.clientX) / unit,
            )
            scheduled.current = false
          })
        }
      }
    }
    function fn2() {
      setMouseDown(undefined)
    }
    if (mouseDown !== undefined) {
      document.addEventListener('mousemove', fn)
      document.addEventListener('mouseup', fn2)
      return () => {
        document.removeEventListener('mousemove', fn)
        document.removeEventListener('mousemove', fn2)
      }
    }
  }, [model, unit, mouseDown])

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
          setMouseDown({
            clientX: event.clientX,
            scrollX: model.scrollX,
          })
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

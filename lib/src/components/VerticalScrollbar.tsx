import React, { useEffect, useRef, useState } from 'react'

import { clamp } from '@jbrowse/core/util'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../model.ts'

const VerticalScrollbar = observer(({ model }: { model: MsaViewModel }) => {
  const { msaAreaHeight, scrollY, totalHeight } = model
  const [hovered, setHovered] = useState(false)
  const scheduled = useRef(false)
  const [mouseDown, setMouseDown] = useState<{
    clientY: number
    scrollY: number
  }>()
  const fill = 'rgba(66, 119, 127, 0.3)'
  const unit = msaAreaHeight / totalHeight
  const top = -scrollY
  const bottom = top + msaAreaHeight
  const t = top * unit
  const b = bottom * unit
  useEffect(() => {
    function fn(event: MouseEvent) {
      if (mouseDown !== undefined) {
        if (!scheduled.current) {
          scheduled.current = true
          window.requestAnimationFrame(() => {
            model.setScrollY(
              clamp(
                mouseDown.scrollY - (event.clientY - mouseDown.clientY) / unit,
                -totalHeight,
                0,
              ),
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
  }, [model, unit, totalHeight, mouseDown])
  return (
    <div
      style={{
        position: 'relative',
        width: 20,
        height: msaAreaHeight,
        borderLeft: '1px solid #555',
        borderTop: '1px solid #555',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: Math.max(0, t),
          left: 0,
          background: hovered ? 'rgba(66,119,127,0.6)' : fill,
          cursor: 'pointer',
          boxSizing: 'border-box',
          width: 20,
          height: Math.max(b - t, 20),
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
            clientY: event.clientY,
            scrollY: model.scrollY,
          })
        }}
      />
    </div>
  )
})
export default VerticalScrollbar

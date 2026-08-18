import React, { useState } from 'react'

import { useDragScroll } from '../useDragScroll.ts'

export const scrollbarThumbFill = 'rgba(66,119,127,0.3)'
const scrollbarThumbFillHovered = 'rgba(66,119,127,0.6)'

/**
 * The draggable thumb shared by the horizontal Minimap and the
 * VerticalScrollbar. `getStart` is read at mousedown and handed back to
 * `onDrag` alongside the pixel delta since, so a caller only supplies the
 * scroll offset it drives and where the thumb sits.
 */
export default function ScrollbarThumb({
  axis,
  getStart,
  onDrag,
  style,
}: {
  axis: 'x' | 'y'
  getStart: () => number
  onDrag: (delta: number, startValue: number) => void
  style: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const { startDrag } = useDragScroll(axis, onDrag)

  return (
    <div
      onMouseOver={() => {
        setHovered(true)
      }}
      onMouseOut={() => {
        setHovered(false)
      }}
      onMouseDown={event => {
        startDrag(event, getStart())
      }}
      style={{
        position: 'absolute',
        zIndex: 100,
        cursor: 'pointer',
        background: hovered ? scrollbarThumbFillHovered : scrollbarThumbFill,
        ...style,
      }}
    />
  )
}

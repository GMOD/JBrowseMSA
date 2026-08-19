import React, { useState } from 'react'

import { useDragScroll } from '../useDragScroll.ts'

export const scrollbarThumbFill = 'rgba(66,119,127,0.3)'

// The scroll thumbs (minimap, vertical scrollbar) and the resize dividers are
// one widget -- press, drag along an axis, report the pixel delta -- differing
// only in the affordance they present, so the variant carries the whole
// difference rather than a second copy of the drag wiring.
const variants: Record<
  'thumb' | 'resizer',
  {
    fill: string
    fillHovered: string
    cursor: (axis: 'x' | 'y') => string
    position: React.CSSProperties['position']
    zIndex?: number
  }
> = {
  thumb: {
    fill: scrollbarThumbFill,
    fillHovered: 'rgba(66,119,127,0.6)',
    cursor: () => 'pointer',
    position: 'absolute',
    zIndex: 100,
  },
  resizer: {
    fill: 'rgba(200,200,200)',
    fillHovered: 'rgba(150,150,150)',
    cursor: axis => (axis === 'x' ? 'ew-resize' : 'ns-resize'),
    position: 'relative',
  },
}

/**
 * A handle dragged along a single axis. `getStart` is read at mousedown and
 * handed back to `onDrag` alongside the pixel delta since, so a caller only
 * supplies the dimension it drives and where the handle sits.
 *
 * Memoize `onDrag` (useCallback) so the document listeners are not re-attached
 * on every render.
 */
export default function DragHandle({
  axis,
  variant,
  getStart,
  onDrag,
  style,
}: {
  axis: 'x' | 'y'
  variant: keyof typeof variants
  getStart: () => number
  onDrag: (delta: number, startValue: number) => void
  style: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const { startDrag } = useDragScroll(axis, onDrag)
  const { fill, fillHovered, cursor, position, zIndex } = variants[variant]

  return (
    <div
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onMouseDown={event => {
        startDrag(event, getStart())
      }}
      style={{
        position,
        zIndex,
        cursor: cursor(axis),
        background: hovered ? fillHovered : fill,
        ...style,
      }}
    />
  )
}

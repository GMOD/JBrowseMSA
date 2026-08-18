import React, { useCallback, useState } from 'react'

import { observer } from 'mobx-react'

import { useDragScroll } from '../useDragScroll.ts'

import type { MsaViewModel } from '../model.ts'

const handleBg = 'rgba(200,200,200)'
const handleBgHover = 'rgba(150,150,150)'

/**
 * A draggable divider. `getStart` is read at mousedown and handed back to
 * `onDrag` alongside the pixel delta since, so each handle below only has to say
 * which model dimension it resizes and where it sits.
 */
function ResizeHandle({
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
      onMouseDown={event => {
        startDrag(event, getStart())
      }}
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      style={{
        position: 'relative',
        cursor: axis === 'x' ? 'ew-resize' : 'ns-resize',
        background: hovered ? handleBgHover : handleBg,
        ...style,
      }}
    />
  )
}

export const VerticalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const onDrag = useCallback(
    (delta: number, startWidth: number) => {
      model.setTreeAreaWidth(startWidth + delta)
    },
    [model],
  )
  return (
    <ResizeHandle
      axis="x"
      getStart={() => model.treeAreaWidth}
      onDrag={onDrag}
      style={{ width: model.resizeHandleWidth }}
    />
  )
})

export const HorizontalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      model.setHeight(startHeight + delta)
    },
    [model],
  )
  return (
    <ResizeHandle
      axis="y"
      getStart={() => model.height}
      onDrag={onDrag}
      style={{ width: '100%', height: model.resizeHandleWidth }}
    />
  )
})

export const ConservationTrackResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      model.setConservationTrackHeight(Math.max(10, startHeight + delta))
    },
    [model],
  )
  return (
    <ResizeHandle
      axis="y"
      getStart={() => model.conservationTrackHeight}
      onDrag={onDrag}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: model.resizeHandleWidth,
        zIndex: 1,
      }}
    />
  )
})

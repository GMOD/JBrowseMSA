import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import { useDragScroll } from '../useDragScroll.ts'

import type { MsaViewModel } from '../model.ts'

export const VerticalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { resizeHandleWidth } = model
  const { startDrag } = useDragScroll(
    'x',
    useCallback(
      (delta: number, startWidth: number) =>
        { model.setTreeAreaWidth(startWidth + delta) },
      [model],
    ),
  )

  return (
    <div
      onMouseDown={event => {
        startDrag(event, model.treeAreaWidth)
      }}
      style={{
        cursor: 'ew-resize',
        height: '100%',
        width: resizeHandleWidth,
        background: 'rgba(200,200,200)',
        position: 'relative',
      }}
    />
  )
})

export const HorizontalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { resizeHandleWidth } = model
  const { startDrag } = useDragScroll(
    'y',
    useCallback(
      (delta: number, startHeight: number) =>
        { model.setHeight(startHeight + delta) },
      [model],
    ),
  )

  return (
    <div
      onMouseDown={event => {
        startDrag(event, model.height)
      }}
      style={{
        cursor: 'ns-resize',
        width: '100%',
        height: resizeHandleWidth,
        background: 'rgba(200,200,200)',
        position: 'relative',
      }}
    />
  )
})

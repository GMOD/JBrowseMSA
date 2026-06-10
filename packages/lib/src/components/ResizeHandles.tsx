import React, { useCallback, useState } from 'react'

import { observer } from 'mobx-react'

import { useDragScroll } from '../useDragScroll.ts'

import type { MsaViewModel } from '../model.ts'

const handleBg = 'rgba(200,200,200)'
const handleBgHover = 'rgba(150,150,150)'

export const VerticalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { resizeHandleWidth } = model
  const [hovered, setHovered] = useState(false)
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
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      style={{
        cursor: 'ew-resize',
        width: resizeHandleWidth,
        background: hovered ? handleBgHover : handleBg,
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
  const [hovered, setHovered] = useState(false)
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
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      style={{
        cursor: 'ns-resize',
        width: '100%',
        height: resizeHandleWidth,
        background: hovered ? handleBgHover : handleBg,
        position: 'relative',
      }}
    />
  )
})

export const ConservationTrackResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { resizeHandleWidth } = model
  const [hovered, setHovered] = useState(false)
  const { startDrag } = useDragScroll(
    'y',
    useCallback(
      (delta: number, startHeight: number) => {
        model.setConservationTrackHeight(Math.max(10, startHeight + delta))
      },
      [model],
    ),
  )

  return (
    <div
      onMouseDown={event => {
        startDrag(event, model.conservationTrackHeight)
      }}
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        cursor: 'ns-resize',
        width: '100%',
        height: resizeHandleWidth,
        zIndex: 1,
        background: hovered ? handleBgHover : handleBg,
      }}
    />
  )
})

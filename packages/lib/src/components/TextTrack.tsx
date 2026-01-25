import React, { useEffect, useMemo, useRef } from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { colorContrast } from '../util.ts'
import { drawTextTrackContent } from './tracks/renderTracksSvg.ts'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack } from '../types.ts'

const AnnotationBlock = observer(function ({
  track,
  model,
  offsetX,
}: {
  track: BasicTrack
  model: MsaViewModel
  offsetX: number
}) {
  const {
    blockSize,
    scrollX,
    bgColor,
    colorScheme: modelColorScheme,
    colWidth,
    fontSize,
    rowHeight,
    highResScaleFactor,
  } = model
  const {
    model: { customColorScheme, data },
  } = track

  const colorScheme = customColorScheme || modelColorScheme
  const theme = useTheme()
  const ref = useRef<HTMLCanvasElement>(null)
  const contrastScheme = useMemo(
    () => colorContrast(colorScheme, theme),
    [colorScheme, theme],
  )
  useEffect(() => {
    if (!ref.current) {
      return
    }

    const ctx = ref.current.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.resetTransform()
    ctx.scale(highResScaleFactor, highResScaleFactor)
    ctx.clearRect(0, 0, blockSize, rowHeight)
    ctx.translate(-offsetX, 0)
    ctx.textAlign = 'center'
    ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`)

    drawTextTrackContent({
      ctx,
      data,
      colorScheme,
      contrastScheme,
      bgColor,
      colWidth,
      rowHeight,
      offsetX,
      blockSize,
    })
  }, [
    fontSize,
    bgColor,
    blockSize,
    colWidth,
    rowHeight,
    offsetX,
    contrastScheme,
    colorScheme,
    highResScaleFactor,
    data,
  ])
  return (
    <canvas
      ref={ref}
      height={rowHeight * highResScaleFactor}
      width={blockSize * highResScaleFactor}
      style={{
        position: 'absolute',
        left: scrollX + offsetX,
        width: blockSize,
        height: rowHeight,
      }}
    />
  )
})
const AnnotationTrack = observer(function ({
  track,
  model,
}: {
  track: BasicTrack
  model: MsaViewModel
}) {
  const { blocksX, msaAreaWidth, rowHeight } = model
  if (!track.model.data) {
    return null
  }
  return (
    <div
      style={{
        position: 'relative',
        height: rowHeight,
        width: msaAreaWidth,
        overflow: 'hidden',
      }}
    >
      {blocksX.map(bx => (
        <AnnotationBlock key={bx} track={track} model={model} offsetX={bx} />
      ))}
    </div>
  )
})

export default AnnotationTrack

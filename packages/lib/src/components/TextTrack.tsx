import React from 'react'

import { observer } from 'mobx-react'

import { setFontSize } from '../setFontSize.ts'
import { useCanvasAutorun } from '../useCanvasAutorun.ts'
import { useColorContrast } from '../useColorContrast.ts'
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
    colorScheme: modelColorScheme,
    rowHeight,
    highResScaleFactor,
  } = model
  const {
    model: { customColorScheme, data },
  } = track

  const colorScheme = customColorScheme ?? modelColorScheme
  const { theme, contrastScheme } = useColorContrast(colorScheme)
  const ref = useCanvasAutorun({
    draw: ctx => {
      const { bgColor, colWidth, fontSize } = model
      ctx.resetTransform()
      ctx.scale(highResScaleFactor, highResScaleFactor)
      ctx.clearRect(0, 0, blockSize, rowHeight)
      ctx.translate(-offsetX, 0)
      ctx.textAlign = 'center'
      setFontSize(ctx, fontSize)

      drawTextTrackContent({
        ctx,
        data,
        colorScheme,
        contrastScheme,
        bgColor,
        textColor: theme.palette.text.primary,
        colWidth,
        rowHeight,
        offsetX,
        blockSize,
      })
    },
    width: blockSize * highResScaleFactor,
    height: rowHeight * highResScaleFactor,
    deps: [model, offsetX, theme, contrastScheme, colorScheme, data],
  })
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

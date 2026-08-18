import React from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../useCanvasAutorun.ts'
import { drawSequenceLogo } from './tracks/drawTracks.ts'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack } from '../types.ts'

const SequenceLogoBlock = observer(function ({
  model,
  offsetX,
  trackHeight,
}: {
  model: MsaViewModel
  offsetX: number
  trackHeight: number
}) {
  const { blockSize, scrollX, highResScaleFactor } = model
  const theme = useTheme()

  const ref = useCanvasAutorun({
    draw: ctx => {
      const { colWidth, colStats, colorScheme, logoMaxBits } = model
      ctx.resetTransform()
      ctx.scale(highResScaleFactor, highResScaleFactor)
      ctx.clearRect(0, 0, blockSize, trackHeight)
      ctx.translate(-offsetX, 0)

      drawSequenceLogo({
        ctx,
        colStats,
        colorScheme,
        maxBits: logoMaxBits,
        textColor: theme.palette.text.primary,
        colWidth,
        trackHeight,
        offsetX,
        blockSize,
      })
    },
    width: blockSize * highResScaleFactor,
    height: trackHeight * highResScaleFactor,
    deps: [model, offsetX, trackHeight, theme],
  })

  return (
    <canvas
      ref={ref}
      height={trackHeight * highResScaleFactor}
      width={blockSize * highResScaleFactor}
      style={{
        position: 'absolute',
        left: scrollX + offsetX,
        width: blockSize,
        height: trackHeight,
      }}
    />
  )
})

const SequenceLogoTrack = observer(function ({
  model,
  track,
}: {
  model: MsaViewModel
  track: BasicTrack
}) {
  const { blocksX, msaAreaWidth } = model
  const trackHeight = track.model.height

  return (
    <div
      style={{
        position: 'relative',
        height: trackHeight,
        width: msaAreaWidth,
        overflow: 'hidden',
      }}
    >
      {blocksX.map(bx => (
        <SequenceLogoBlock
          key={bx}
          model={model}
          offsetX={bx}
          trackHeight={trackHeight}
        />
      ))}
    </div>
  )
})

export default SequenceLogoTrack

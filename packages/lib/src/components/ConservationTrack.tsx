import React from 'react'

import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../useCanvasAutorun.ts'
import { ConservationTrackResizeHandle } from './ResizeHandles.tsx'
import {
  barTrackValues,
  drawConservationBars,
} from './tracks/renderTracksSvg.ts'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack } from '../types.ts'

const ConservationBlock = observer(function ({
  model,
  track,
  offsetX,
  trackHeight,
}: {
  model: MsaViewModel
  track: BasicTrack
  offsetX: number
  trackHeight: number
}) {
  const { blockSize, scrollX, highResScaleFactor } = model

  const ref = useCanvasAutorun(
    ctx => {
      const { blockSize, colWidth, highResScaleFactor } = model
      ctx.resetTransform()
      ctx.scale(highResScaleFactor, highResScaleFactor)
      ctx.clearRect(0, 0, blockSize, trackHeight)
      ctx.translate(-offsetX, 0)

      drawConservationBars({
        ctx,
        values: barTrackValues(model, track.model.id),
        color: track.model.barColor ?? 'gray',
        colWidth,
        trackHeight,
        offsetX,
        blockSize,
      })
    },
    [model, track, offsetX, trackHeight],
  )

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

const ConservationTrack = observer(function ({
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
        <ConservationBlock
          key={bx}
          model={model}
          track={track}
          offsetX={bx}
          trackHeight={trackHeight}
        />
      ))}
      <ConservationTrackResizeHandle model={model} />
    </div>
  )
})

export default ConservationTrack

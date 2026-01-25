import React, { useEffect, useRef } from 'react'

import { ResizeHandle } from '@jbrowse/core/ui'
import { observer } from 'mobx-react'

import { drawConservationBars } from './tracks/renderTracksSvg.ts'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack } from '../types.ts'

const ConservationBlock = observer(function ({
  model,
  offsetX,
  trackHeight,
}: {
  model: MsaViewModel
  offsetX: number
  trackHeight: number
}) {
  const { blockSize, scrollX, colWidth, highResScaleFactor, conservation } =
    model

  const ref = useRef<HTMLCanvasElement>(null)

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
    ctx.clearRect(0, 0, blockSize, trackHeight)
    ctx.translate(-offsetX, 0)

    drawConservationBars({
      ctx,
      conservation,
      colWidth,
      trackHeight,
      offsetX,
      blockSize,
    })
  }, [
    blockSize,
    colWidth,
    trackHeight,
    offsetX,
    highResScaleFactor,
    conservation,
  ])

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
    <>
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
            offsetX={bx}
            trackHeight={trackHeight}
          />
        ))}
      </div>
      <ResizeHandle
        onDrag={delta => {
          model.setConservationTrackHeight(
            Math.max(10, model.conservationTrackHeight - delta),
          )
          return delta
        }}
        style={{
          height: 3,
          background: '#ccc',
        }}
      />
    </>
  )
})

export default ConservationTrack

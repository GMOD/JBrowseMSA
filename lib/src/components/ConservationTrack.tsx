import React, { useEffect, useRef } from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../model'
import type { IConservationTrack } from '../types'

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

    const xStart = Math.max(0, Math.floor(offsetX / colWidth))
    const xEnd = Math.max(0, Math.ceil((offsetX + blockSize) / colWidth))

    for (let i = xStart; i < xEnd && i < conservation.length; i++) {
      const value = conservation[i]!
      const barHeight = value * trackHeight
      const x = i * colWidth

      const hue = value * 120
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      ctx.fillRect(x, trackHeight - barHeight, colWidth, barHeight)
    }
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
  track: IConservationTrack
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
          offsetX={bx}
          trackHeight={trackHeight}
        />
      ))}
    </div>
  )
})

export default ConservationTrack

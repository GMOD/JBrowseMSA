import React from 'react'

import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { useColorContrast } from '../../useColorContrast.ts'
import { TrackResizeHandle } from '../ResizeHandles.tsx'
import { drawTrackBlock } from './drawTracks.ts'

import type { MsaViewModel } from '../../model.ts'
import type { BasicTrack } from '../../types.ts'

const TrackBlock = observer(function ({
  model,
  track,
  offsetX,
}: {
  model: MsaViewModel
  track: BasicTrack
  offsetX: number
}) {
  const { blockSize, scrollX, colorScheme, highResScaleFactor } = model
  const { height, customColorScheme } = track.model
  const { theme, contrastScheme } = useColorContrast(
    customColorScheme ?? colorScheme,
  )
  const canvasWidth = blockSize * highResScaleFactor
  const canvasHeight = height * highResScaleFactor

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      drawTrackBlock({ model, ctx, track, offsetX, theme, contrastScheme })
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, track, offsetX, theme, contrastScheme],
  })

  return (
    <canvas
      ref={ref}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        left: scrollX + offsetX,
        width: blockSize,
        height,
      }}
    />
  )
})

/**
 * The canvas blocks covering one track's row of the alignment. Every track kind
 * shares this host: what differs between conservation, sequence logo and the
 * Stockholm text tracks is which draw function `drawTrackBlock` dispatches to,
 * not how the blocks are laid out or kept in sync with the horizontal scroll.
 */
const TrackBlocks = observer(function ({
  model,
  track,
}: {
  model: MsaViewModel
  track: BasicTrack
}) {
  const { blocksX, msaAreaWidth } = model
  const { kind, height, data } = track.model

  // a text track with no data draws nothing, and an empty row of its own would
  // still take up vertical space
  if (kind === 'text' && !data) {
    return null
  }

  return (
    <div
      style={{
        position: 'relative',
        height,
        width: msaAreaWidth,
        overflow: 'hidden',
      }}
    >
      {blocksX.map(bx => (
        <TrackBlock key={bx} model={model} track={track} offsetX={bx} />
      ))}
      <TrackResizeHandle model={model} kind={kind} />
    </div>
  )
})

export default TrackBlocks

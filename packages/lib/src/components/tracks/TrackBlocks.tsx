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
  const { blockSize, colorScheme, highResScaleFactor } = model
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
        left: offsetX,
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
  // msaCanvasWidth, not msaAreaWidth: a track row is a legend for the columns
  // directly below it, so it has to stop where the alignment canvas does rather
  // than running on another 20px under the vertical scrollbar -- otherwise the
  // last columns appear in the tracks but not in the alignment, and the hovered
  // -column indicator (sized to the canvas) stops short of the track it crosses
  const { blocksX, msaCanvasWidth, scrollX } = model
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
        width: msaCanvasWidth,
        overflow: 'hidden',
      }}
    >
      {/* one transform for the whole block set, matching MSACanvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translateX(${scrollX}px)`,
          willChange: 'transform',
        }}
      >
        {blocksX.map(bx => (
          <TrackBlock key={bx} model={model} track={track} offsetX={bx} />
        ))}
      </div>
      <TrackResizeHandle model={model} kind={kind} />
    </div>
  )
})

export default TrackBlocks

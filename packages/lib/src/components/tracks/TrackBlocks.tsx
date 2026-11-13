import React from 'react'

import { observer } from 'mobx-react'

import { useCanvasTheme } from '../../darkReader.ts'
import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { TrackResizeHandle } from '../ResizeHandles.tsx'
import { arcMaxSpan, arcPath } from './arcGeometry.ts'
import { arcPaint } from './arcPaint.ts'
import { drawTrackBlock } from './drawTracks.ts'

import type { MsaViewModel } from '../../model.ts'
import type { Arc, BasicTrack } from '../../types.ts'

const TrackBlock = observer(function ({
  model,
  track,
  offsetX,
}: {
  model: MsaViewModel
  track: BasicTrack
  offsetX: number
}) {
  const { blockSize, highResScaleFactor } = model
  const { height } = track.model
  const theme = useCanvasTheme()
  const canvasWidth = blockSize * highResScaleFactor
  const canvasHeight = height * highResScaleFactor

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      const strip = track.model.kind === 'highlights'
      drawTrackBlock({
        model,
        ctx,
        track,
        offsetX,
        theme,
        viewLeft: strip ? -model.scrollX : undefined,
        hoveredHighlight: strip ? model.hoveredHighlight : undefined,
      })
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, track, offsetX, theme],
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

// the arcs under the pointer, stroked again at 2px over the canvas so the ones
// the tooltip lists stand out of a bundle
const HoveredArcs = observer(function ({
  model,
  track,
  arcs,
}: {
  model: MsaViewModel
  track: BasicTrack
  arcs: Arc[]
}) {
  const theme = useCanvasTheme()
  const { colWidth, scrollX, msaCanvasWidth } = model
  const { height } = track.model
  const maxSpan = arcMaxSpan(track.model.arcs ?? [])
  const { strokeOf } = arcPaint(model, track, theme)
  return (
    <svg
      width={msaCanvasWidth}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <g transform={`translate(${scrollX} 0)`}>
        {arcs.map(arc => (
          <path
            key={`${arc.start}-${arc.end}-${arc.name ?? ''}`}
            d={arcPath({ arc, colWidth, maxSpan, trackHeight: height })}
            fill="none"
            stroke={strokeOf(arc)}
            strokeWidth={2}
          />
        ))}
      </g>
    </svg>
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
  hoveredArcs,
}: {
  model: MsaViewModel
  track: BasicTrack
  hoveredArcs?: Arc[]
}) {
  // msaCanvasWidth, not msaAreaWidth: tracks stop where the alignment canvas
  // does, not 20px further under the vertical scrollbar, so their columns and
  // the hover indicator line up with the alignment
  const { blocksX, msaCanvasWidth, scrollX } = model
  const { kind, height, data, arcs, spans } = track.model

  // a track with nothing to draw would still take up its vertical space
  if (
    (kind === 'text' && !data) ||
    (kind === 'arc' && !arcs?.length) ||
    (kind === 'features' && !spans?.length)
  ) {
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
      {hoveredArcs?.length ? (
        <HoveredArcs model={model} track={track} arcs={hoveredArcs} />
      ) : null}
      <TrackResizeHandle model={model} track={track} />
    </div>
  )
})

export default TrackBlocks

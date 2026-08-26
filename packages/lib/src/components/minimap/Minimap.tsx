import React, { useCallback } from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import DragHandle, { scrollbarThumbFill } from '../DragHandle.tsx'
import { msaThumbnail } from '../msa/msaRaster.ts'
import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

import type { MsaViewModel } from '../../model.ts'

const Minimap = observer(function ({ model }: { model: MsaViewModel }) {
  const { minimapHeight, msaCanvasWidth, highResScaleFactor } = model
  const theme = useTheme()
  const { unit, s, w, polygonHeight, polygonPoints } = getMinimapLayout(model)

  // the whole alignment, sampled down to the bar: it says where the conserved
  // blocks and the gappy stretches are, which is what a scroll aims at
  const barWidth = Math.round(msaCanvasWidth * highResScaleFactor)
  const barHeight = Math.round(MINIMAP_BAR_HEIGHT * highResScaleFactor)
  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, barWidth, barHeight)
      const thumbnail = msaThumbnail({
        model,
        theme,
        height: MINIMAP_BAR_HEIGHT,
      })
      if (thumbnail) {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(
          thumbnail,
          0,
          0,
          thumbnail.width,
          thumbnail.height,
          0,
          0,
          barWidth,
          barHeight,
        )
      }
    },
    width: barWidth,
    height: barHeight,
    deps: [model, theme],
  })

  const onDrag = useCallback(
    (delta: number, startScroll: number) => {
      model.setScrollX(startScroll - delta / unit)
    },
    [model, unit],
  )

  return (
    // sized and placed to match the alignment canvas exactly: a minimap that
    // spans a different width than the columns it maps puts its viewport
    // rectangle over the wrong ones
    <div
      style={{
        position: 'relative',
        height: minimapHeight,
        width: msaCanvasWidth,
        flexShrink: 0,
      }}
    >
      <canvas
        ref={ref}
        width={barWidth}
        height={barHeight}
        style={{
          display: 'block',
          width: msaCanvasWidth,
          height: MINIMAP_BAR_HEIGHT,
          boxSizing: 'border-box',
          border: '1px solid #555',
        }}
      />
      <DragHandle
        axis="x"
        variant="thumb"
        getStart={() => model.scrollX}
        onDrag={onDrag}
        style={{
          top: 0,
          left: Math.max(0, s),
          height: MINIMAP_BAR_HEIGHT,
          width: w,
        }}
      />

      <svg height={polygonHeight} width={msaCanvasWidth}>
        <polygon fill={scrollbarThumbFill} points={polygonPoints} />
      </svg>
    </div>
  )
})

export default Minimap

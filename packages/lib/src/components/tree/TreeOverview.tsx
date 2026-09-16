import React, { useState } from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import {
  drawTreeOverview,
  drawTreeOverviewBox,
  treeOverviewImage,
} from './renderTreeOverview.ts'

import type { MsaViewModel } from '../../model.ts'

/**
 * The brush on the row scale: the whole tree drawn small above the tree panel,
 * with the focused subtree boxed. A click focuses the subtree under the
 * pointer, and a click inside the box clears the focus.
 *
 * The tree itself comes off a cached offscreen canvas, so the frames a pointer
 * moving across it costs are a blit and two boxes.
 */
const TreeOverview = observer(function ({ model }: { model: MsaViewModel }) {
  const { treeAreaWidth, overviewHeight, highResScaleFactor } = model
  const theme = useTheme()
  const [hover, setHover] = useState<{ id: string; rows: [number, number] }>()
  const width = Math.round(treeAreaWidth * highResScaleFactor)
  const height = Math.round(overviewHeight * highResScaleFactor)

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, width, height)
      const image = treeOverviewImage({
        model,
        theme,
        width: treeAreaWidth,
        height: overviewHeight,
        scale: highResScaleFactor,
      })
      ctx.scale(highResScaleFactor, highResScaleFactor)
      const box = { model, ctx, width: treeAreaWidth, height: overviewHeight }
      if (image) {
        ctx.drawImage(
          image,
          0,
          0,
          image.width,
          image.height,
          0,
          0,
          box.width,
          box.height,
        )
      } else {
        drawTreeOverview({ ...box, theme })
      }
      if (hover) {
        drawTreeOverviewBox({
          ...box,
          rows: hover.rows,
          color: theme.palette.text.secondary,
        })
      }
      const focus = model.treeOverviewFocusRows
      if (focus) {
        drawTreeOverviewBox({
          ...box,
          rows: focus,
          color: theme.palette.text.primary,
        })
      }
    },
    width,
    height,
    deps: [model, theme, hover],
  })

  return (
    <canvas
      data-testid="tree_overview"
      ref={ref}
      width={width}
      height={height}
      style={{
        display: 'block',
        flexShrink: 0,
        cursor: 'pointer',
        width: treeAreaWidth,
        height: overviewHeight,
      }}
      onMouseMove={event => {
        const hit = model.treeOverviewHit(event.nativeEvent.offsetY)
        setHover(prev => (prev?.id === hit?.id ? prev : hit))
      }}
      onMouseLeave={() => {
        setHover(undefined)
      }}
      onClick={event => {
        model.treeOverviewClick(event.nativeEvent.offsetY)
      }}
    />
  )
})

export default TreeOverview

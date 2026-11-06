import React, { useState } from 'react'

import { action, observable } from 'mobx'
import { observer } from 'mobx-react'

import { useCanvasTheme } from '../../darkReader.ts'
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
  const { effectiveTreeAreaWidth, overviewHeight, highResScaleFactor } = model
  const theme = useCanvasTheme()
  const [hover] = useState(() =>
    observable.box<{ id: string; rows: [number, number] } | undefined>(
      undefined,
      { deep: false },
    ),
  )
  const width = Math.round(effectiveTreeAreaWidth * highResScaleFactor)
  const height = Math.round(overviewHeight * highResScaleFactor)

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, width, height)
      const image = treeOverviewImage({
        model,
        theme,
        width: effectiveTreeAreaWidth,
        height: overviewHeight,
        scale: highResScaleFactor,
      })
      ctx.scale(highResScaleFactor, highResScaleFactor)
      const box = {
        model,
        ctx,
        width: effectiveTreeAreaWidth,
        height: overviewHeight,
      }
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
      const hovered = hover.get()
      if (hovered) {
        drawTreeOverviewBox({
          ...box,
          rows: hovered.rows,
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
    deps: [model, theme],
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
        width: effectiveTreeAreaWidth,
        height: overviewHeight,
      }}
      onMouseMove={action(event => {
        const hit = model.treeOverviewHit(event.nativeEvent.offsetY)
        if (hover.get()?.id !== hit?.id) {
          hover.set(hit)
        }
      })}
      onMouseLeave={action(() => {
        hover.set(undefined)
      })}
      onClick={event => {
        model.treeOverviewClick(event.nativeEvent.offsetY)
      }}
    />
  )
})

export default TreeOverview

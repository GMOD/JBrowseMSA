import { clickColor, hoverColor, multiRowHoverColor } from '../overlayColors.ts'
import { fillRowRuns, rowRuns } from '../rowBands.ts'
import {
  renderPersistentHighlights,
  renderSelection,
} from './renderHighlights.ts'

import type { MsaViewModel } from '../../model.ts'
import type { Theme } from '@mui/material'

export function renderMouseover({
  ctx,
  model,
  theme,
}: {
  ctx: CanvasRenderingContext2D
  model: MsaViewModel
  theme: Theme
}) {
  const {
    mouseCol,
    colWidth,
    msaCanvasWidth: width,
    msaAreaHeight: height,
    rowHeight,
    scrollX,
    scrollY,
    mouseRow,
    mouseClickRow,
    mouseClickCol,
    highResScaleFactor,
    hoveredRowIndices,
  } = model
  ctx.resetTransform()
  ctx.clearRect(0, 0, width * highResScaleFactor, height * highResScaleFactor)
  ctx.scale(highResScaleFactor, highResScaleFactor)

  const area = {
    ctx,
    rowHeight,
    top: scrollY,
    x: 0,
    width,
    yMin: 0,
    yMax: height,
  }
  const rowBand = (index: number) => {
    fillRowRuns(area, [[index, index]])
  }
  const colBand = (index: number) => {
    ctx.fillRect(index * colWidth + scrollX, 0, colWidth, height)
  }

  renderPersistentHighlights({
    ctx,
    model,
    theme,
    offsetX: -scrollX,
    offsetY: -scrollY,
    width,
    height,
    hoveredHighlight: model.hoveredHighlight,
  })
  renderSelection({ ctx, model, offsetX: -scrollX, offsetY: -scrollY, height })

  // every tip under a hovered tree node stays lit
  ctx.fillStyle = multiRowHoverColor
  fillRowRuns(area, rowRuns(hoveredRowIndices))

  ctx.fillStyle = hoverColor
  if (mouseCol !== undefined) {
    colBand(mouseCol)
  }
  if (mouseRow !== undefined) {
    rowBand(mouseRow)
  }
  ctx.fillStyle = clickColor
  if (mouseClickCol !== undefined) {
    colBand(mouseClickCol)
  }
  if (mouseClickRow !== undefined) {
    rowBand(mouseClickRow)
  }
}

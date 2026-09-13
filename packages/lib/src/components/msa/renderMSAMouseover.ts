import { clickColor, hoverColor, multiRowHoverColor } from '../overlayColors.ts'
import { renderPersistentHighlights } from './renderHighlights.ts'

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
    height,
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

  // rows and columns sit at a fixed pitch, so an index is all it takes to place
  // a full-width or full-height band (matching fillRow in TreeCanvas)
  const rowBand = (index: number) => {
    ctx.fillRect(0, index * rowHeight + scrollY, width, rowHeight)
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
  })

  // every tip under a hovered tree node stays lit
  ctx.fillStyle = multiRowHoverColor
  for (const rowIndex of hoveredRowIndices) {
    rowBand(rowIndex)
  }

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

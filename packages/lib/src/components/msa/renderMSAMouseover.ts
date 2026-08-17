import {
  clickColor,
  hoverColor,
  multiRowHoverColor,
  referenceColor,
} from '../overlayColors.ts'

import type { MsaViewModel } from '../../model.ts'

// the persistent highlightColumns overlay: a stronger fill plus a solid border
// so a domain/motif band reads clearly over the colored alignment cells (the
// faint hover-style wash alone is invisible against clustalx coloring)
const highlightColumnsFill = 'rgba(255,140,0,0.28)'
const highlightColumnsBorder = 'rgba(210,90,0,0.95)'

export function renderMouseover({
  ctx,
  model,
}: {
  ctx: CanvasRenderingContext2D
  model: MsaViewModel
}) {
  const {
    mouseCol,
    colWidth,
    msaAreaWidth,
    verticalScrollbarWidth,
    height,
    rowHeight,
    scrollX,
    scrollY,
    mouseRow,
    mouseClickRow,
    mouseClickCol,
    highResScaleFactor,
    referenceRowIndex,
    hoveredRowIndices,
    highlightedColumnRuns,
  } = model
  const width = msaAreaWidth - verticalScrollbarWidth
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

  // the reference row (relativeTo) stays lit, as does every tip under a hovered
  // tree node
  if (referenceRowIndex !== undefined) {
    ctx.fillStyle = referenceColor
    rowBand(referenceRowIndex)
  }
  ctx.fillStyle = multiRowHoverColor
  for (const rowIndex of hoveredRowIndices) {
    rowBand(rowIndex)
  }

  // each contiguous run of highlighted columns draws as one filled, bordered
  // band, so a domain/motif highlight stays visible over the alignment
  ctx.lineWidth = 2
  for (const { start, end } of highlightedColumnRuns) {
    const x = start * colWidth + scrollX
    const w = (end - start + 1) * colWidth
    ctx.fillStyle = highlightColumnsFill
    ctx.fillRect(x, 0, w, height)
    ctx.strokeStyle = highlightColumnsBorder
    ctx.strokeRect(x, 0, w, height)
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

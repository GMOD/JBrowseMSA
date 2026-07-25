import { multiRowHoverColor, referenceColor } from '../overlayColors.ts'

import type { MsaViewModel } from '../../model.ts'

const hoverColor = 'rgba(0,0,0,0.15)'
const highlightColor = 'rgba(128,128,0,0.2)'
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

  // Highlight reference row (relativeTo) persistently
  if (referenceRowIndex !== undefined) {
    ctx.fillStyle = referenceColor
    ctx.fillRect(0, referenceRowIndex * rowHeight + scrollY, width, rowHeight)
  }

  // Highlight multiple rows when hovering over tree nodes with children
  if (hoveredRowIndices.length > 0) {
    ctx.fillStyle = multiRowHoverColor
    for (const rowIndex of hoveredRowIndices) {
      ctx.fillRect(0, rowIndex * rowHeight + scrollY, width, rowHeight)
    }
  }

  // Highlight multiple columns — draw each contiguous run as a filled, bordered
  // band so a domain/motif highlight is clearly visible over the alignment
  if (highlightedColumnRuns.length > 0) {
    ctx.lineWidth = 2
    for (const { start, end } of highlightedColumnRuns) {
      const x = start * colWidth + scrollX
      const w = (end - start + 1) * colWidth
      ctx.fillStyle = highlightColumnsFill
      ctx.fillRect(x, 0, w, height)
      ctx.strokeStyle = highlightColumnsBorder
      ctx.strokeRect(x, 0, w, height)
    }
  }

  if (mouseCol !== undefined) {
    ctx.fillStyle = hoverColor
    ctx.fillRect(mouseCol * colWidth + scrollX, 0, colWidth, height)
  }
  if (mouseRow !== undefined) {
    ctx.fillStyle = hoverColor
    ctx.fillRect(0, mouseRow * rowHeight + scrollY, width, rowHeight)
  }
  if (mouseClickCol !== undefined) {
    ctx.fillStyle = highlightColor
    ctx.fillRect(mouseClickCol * colWidth + scrollX, 0, colWidth, height)
  }
  if (mouseClickRow !== undefined) {
    ctx.fillStyle = highlightColor
    ctx.fillRect(0, mouseClickRow * rowHeight + scrollY, width, rowHeight)
  }
}

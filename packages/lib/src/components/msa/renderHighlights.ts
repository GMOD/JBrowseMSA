import { setFontSize } from '../../setFontSize.ts'
import { referenceColor } from '../overlayColors.ts'

import type { MsaViewModel } from '../../model.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

// a stronger fill plus a solid border, so a domain/motif band reads clearly over
// the colored alignment cells (the faint hover-style wash alone is invisible
// against clustalx coloring)
export const highlightFill = 'rgba(255,140,0,0.28)'
export const highlightBorder = 'rgba(210,90,0,0.95)'
export const highlightRowFill = 'rgba(255,140,0,0.18)'

export const labelFontSize = 11
const labelPad = 3

export function drawHighlightLabel({
  ctx,
  theme,
  label,
  x,
  y,
  spanWidth,
}: {
  ctx: RenderCtx
  theme: Theme
  label: string
  x: number
  y: number
  spanWidth: number
}) {
  setFontSize(ctx, labelFontSize)
  ctx.textAlign = 'start'
  const boxWidth = ctx.measureText(label).width + labelPad * 2
  const boxHeight = labelFontSize + labelPad * 2
  const left = boxWidth <= spanWidth ? x : x + spanWidth + 2
  ctx.fillStyle = theme.palette.background.paper
  ctx.fillRect(left, y, boxWidth, boxHeight)
  ctx.fillStyle = theme.palette.text.primary
  ctx.fillText(label, left + labelPad, y + labelPad + labelFontSize - 2)
}

/**
 * The persistent `highlights` overlay on the alignment: row tints, bordered
 * column bands, and a label above each band. `offsetX`/`offsetY` are the
 * content coordinates at the canvas origin, the convention renderMSABlock
 * uses, so the live overlay passes -scrollX/-scrollY and the export passes its
 * layout offsets.
 */
export function renderHighlights({
  ctx,
  model,
  theme,
  offsetX,
  offsetY,
  width,
  height,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  offsetX: number
  offsetY: number
  width: number
  height: number
}) {
  const { resolvedHighlights, colWidth, rowHeight } = model
  ctx.lineWidth = 2
  for (const { rowIndices, color } of resolvedHighlights) {
    ctx.fillStyle = color ?? highlightRowFill
    for (const index of rowIndices) {
      ctx.fillRect(0, index * rowHeight - offsetY, width, rowHeight)
    }
  }
  for (const { startCol, endCol, label, color } of resolvedHighlights) {
    if (startCol === undefined || endCol === undefined) {
      continue
    }
    const x = startCol * colWidth - offsetX
    const spanWidth = (endCol - startCol + 1) * colWidth
    ctx.fillStyle = color ?? highlightFill
    ctx.fillRect(x, 0, spanWidth, height)
    ctx.strokeStyle = color ?? highlightBorder
    ctx.strokeRect(x, 0, spanWidth, height)
    if (label) {
      drawHighlightLabel({ ctx, theme, label, x, y: 0, spanWidth })
    }
  }
}

/**
 * Everything the alignment overlay owes to the document rather than to the
 * mouse: the reference row's tint, a bordered band per run of highlighted
 * columns, and the `highlights` layer. The live overlay canvas draws these
 * under its hover and click bands, and the SVG export draws them and stops --
 * a shared link that opens with columns highlighted exports with them too.
 */
export function renderPersistentHighlights({
  ctx,
  model,
  theme,
  offsetX,
  offsetY,
  width,
  height,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  offsetX: number
  offsetY: number
  width: number
  height: number
}) {
  const { colWidth, rowHeight, referenceRowIndex, highlightedColumnRuns } =
    model

  if (referenceRowIndex !== undefined) {
    ctx.fillStyle = referenceColor
    ctx.fillRect(0, referenceRowIndex * rowHeight - offsetY, width, rowHeight)
  }

  ctx.lineWidth = 2
  for (const { start, end } of highlightedColumnRuns) {
    const x = start * colWidth - offsetX
    const w = (end - start + 1) * colWidth
    ctx.fillStyle = highlightFill
    ctx.fillRect(x, 0, w, height)
    ctx.strokeStyle = highlightBorder
    ctx.strokeRect(x, 0, w, height)
  }

  renderHighlights({ ctx, model, theme, offsetX, offsetY, width, height })
}

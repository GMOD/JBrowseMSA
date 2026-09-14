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
// the label box a highlight draws above its band, and the reason a tree block
// has to consider rows a little outside itself
export const highlightLabelHeight = labelFontSize + labelPad * 2

export interface LabelBox {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * A highlight's label, over its band where it fits and beside it where it does
 * not, kept inside `bounds` and out of the way of the labels already placed.
 *
 * Two single-residue highlights a column apart both want the same few pixels to
 * the right of their bands, and a band scrolled off the left edge wants its
 * label off-frame with it: the first overdrew two labels into an unreadable
 * smudge, the second left the visible band untitled. Pass `placed` and each
 * later label steps down a row instead of over the one before.
 */
export function drawHighlightLabel({
  ctx,
  theme,
  label,
  x,
  y,
  spanWidth,
  bounds,
  placed,
}: {
  ctx: RenderCtx
  theme: Theme
  label: string
  x: number
  y: number
  spanWidth: number
  bounds?: { min: number; max: number }
  placed?: LabelBox[]
}) {
  setFontSize(ctx, labelFontSize)
  ctx.textAlign = 'start'
  const boxWidth = ctx.measureText(label).width + labelPad * 2
  const boxHeight = highlightLabelHeight
  let left = boxWidth <= spanWidth ? x : x + spanWidth + 2
  if (bounds) {
    left = Math.max(bounds.min, Math.min(left, bounds.max - boxWidth))
  }
  let top = y
  if (placed) {
    const overlaps = (box: LabelBox) =>
      box.left < left + boxWidth &&
      box.right > left &&
      box.top < top + boxHeight &&
      box.bottom > top
    while (placed.some(overlaps)) {
      top += boxHeight
    }
    placed.push({ left, right: left + boxWidth, top, bottom: top + boxHeight })
  }
  ctx.fillStyle = theme.palette.background.paper
  ctx.fillRect(left, top, boxWidth, boxHeight)
  ctx.fillStyle = theme.palette.text.primary
  ctx.fillText(label, left + labelPad, top + labelPad + labelFontSize - 2)
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
  const placed: LabelBox[] = []
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
      drawHighlightLabel({
        ctx,
        theme,
        label,
        x,
        y: 0,
        spanWidth,
        bounds: { min: 0, max: width },
        placed,
      })
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

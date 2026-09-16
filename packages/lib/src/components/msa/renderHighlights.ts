import { setFontSize } from '../../setFontSize.ts'
import { referenceColor } from '../overlayColors.ts'

import type { MsaViewModel } from '../../model.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

// a fill plus a solid border; the hover wash alone is invisible over clustalx
// coloring
export const highlightFill = 'rgba(255,140,0,0.28)'
export const highlightBorder = 'rgba(210,90,0,0.95)'
export const highlightRowFill = 'rgba(255,140,0,0.18)'

export const labelFontSize = 11
const labelPad = 3
// the label box above a highlight band; tree blocks also check rows this far
// outside themselves
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
 * `bounds` keeps the label of a band scrolled partly off the left edge visible.
 * With `placed`, a label that would overlap an earlier one, as two
 * single-residue highlights a column apart do, steps down a row.
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
 * The persistent overlay on the alignment: the band behind each clade of
 * `clades`, the `rowTint` encoding's wash, the row tints and bordered column
 * bands of `highlights`, and a label above each band. `offsetX`/`offsetY` are
 * the content coordinates at the canvas origin, the convention renderMSABlock
 * uses, so the live overlay passes -scrollX/-scrollY and the export passes its
 * layout offsets.
 *
 * Rows are culled to the ones this block covers. A tint over every row of a
 * large alignment would otherwise draw the whole column of rects in each block,
 * and again on every pointer move through renderMouseover.
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
  const { resolvedClades, resolvedHighlights, rowTints, colWidth, rowHeight } =
    model
  const placed: LabelBox[] = []
  ctx.lineWidth = 2
  const firstRow = Math.max(0, Math.floor(offsetY / rowHeight))
  const lastRow = Math.ceil((offsetY + height) / rowHeight)
  const fillRow = (index: number) => {
    ctx.fillRect(0, index * rowHeight - offsetY, width, rowHeight)
  }
  for (const { rows, color, mark } of resolvedClades) {
    if (mark === 'highlight' && rows[1] >= firstRow && rows[0] <= lastRow) {
      ctx.fillStyle = color
      ctx.fillRect(
        0,
        rows[0] * rowHeight - offsetY,
        width,
        (rows[1] - rows[0] + 1) * rowHeight,
      )
    }
  }
  if (rowTints) {
    for (
      let index = firstRow;
      index <= Math.min(lastRow, rowTints.length - 1);
      index++
    ) {
      const color = rowTints[index]
      if (color) {
        ctx.fillStyle = color
        fillRow(index)
      }
    }
  }
  for (const { rowIndices, color } of resolvedHighlights) {
    ctx.fillStyle = color ?? highlightRowFill
    for (const index of rowIndices) {
      if (index >= firstRow && index <= lastRow) {
        fillRow(index)
      }
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
 * The overlay parts that come from the snapshot: the reference row's tint, a
 * bordered band per run of highlighted columns, and the `highlights` layer. The
 * live overlay draws these under its hover and click bands; the SVG export
 * draws only these.
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

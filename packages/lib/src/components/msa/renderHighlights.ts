import { setFontSize } from '../../setFontSize.ts'
import {
  referenceColor,
  selectionBorder,
  selectionFill,
} from '../overlayColors.ts'
import { fillRowRuns, rowRuns, visibleRowRange } from '../rowBands.ts'

import type { MsaViewModel } from '../../model.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { RowBandArea } from '../rowBands.ts'
import type { Theme } from '@mui/material'

// a fill plus a solid border; the hover wash alone is invisible over clustalx
// coloring
const highlightFill = 'rgba(255,140,0,0.28)'
const highlightBorder = 'rgba(210,90,0,0.95)'
const highlightRowFill = 'rgba(255,140,0,0.18)'

const labelFontSize = 11
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

export function renderReferenceRow(area: RowBandArea, model: MsaViewModel) {
  const { referenceRowIndex } = model
  if (referenceRowIndex !== undefined) {
    area.ctx.fillStyle = referenceColor
    fillRowRuns(area, [[referenceRowIndex, referenceRowIndex]])
  }
}

/**
 * The washes across whole rows of a panel: the `rowTint` encoding, the
 * reference row and the row sets of `highlights`. The alignment and the tree
 * area each pass their own extent, and only the rows the area shows are drawn.
 * The alignment draws its reference row first, under the column bands, so it
 * passes `reference: false`.
 */
export function renderRowWashes(
  area: RowBandArea,
  model: MsaViewModel,
  { reference = true } = {},
) {
  const { ctx } = area
  const { rowTints, resolvedHighlights } = model
  if (rowTints) {
    const [first, last] = visibleRowRange(area)
    for (
      let index = first;
      index <= Math.min(last, rowTints.length - 1);
      index++
    ) {
      const color = rowTints[index]
      if (color) {
        ctx.fillStyle = color
        fillRowRuns(area, [[index, index]])
      }
    }
  }
  if (reference) {
    renderReferenceRow(area, model)
  }
  for (const { rowIndices, color } of resolvedHighlights) {
    ctx.fillStyle = color ?? highlightRowFill
    fillRowRuns(area, rowRuns(rowIndices))
  }
}

/**
 * The persistent overlay on the alignment: the band behind each clade of
 * `clades`, the row washes, the bordered column bands of `highlights`, and a
 * label above each band. `offsetX`/`offsetY` are the content coordinates at the
 * canvas origin, the convention renderMSABlock uses, so the live overlay passes
 * -scrollX/-scrollY and the export passes its layout offsets.
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
  const { resolvedClades, resolvedHighlights, colWidth, rowHeight } = model
  const area = {
    ctx,
    rowHeight,
    top: -offsetY,
    x: 0,
    width,
    yMin: 0,
    yMax: height,
  }
  for (const { rows, color, mark } of resolvedClades) {
    if (mark === 'highlight') {
      ctx.fillStyle = color
      fillRowRuns(area, [rows])
    }
  }
  renderRowWashes(area, model, { reference: false })
  const placed: LabelBox[] = []
  ctx.lineWidth = 2
  for (const { startCol, endCol, label, color } of resolvedHighlights) {
    if (startCol === undefined || endCol === undefined) {
      continue
    }
    const x = startCol * colWidth - offsetX
    const spanWidth = (endCol - startCol + 1) * colWidth
    if (x + spanWidth <= 0 || x >= width) {
      continue
    }
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
 * The selected block, a bordered band per run of consecutive selected rows,
 * culled to the rows this block covers
 */
export function renderSelection({
  ctx,
  model,
  offsetX,
  offsetY,
  height,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  offsetX: number
  offsetY: number
  height: number
}) {
  const { resolvedSelection, colWidth, rowHeight } = model
  if (!resolvedSelection) {
    return
  }
  const { startCol, endCol, rowRuns } = resolvedSelection
  const x = startCol * colWidth - offsetX
  const w = (endCol - startCol + 1) * colWidth
  ctx.lineWidth = 1
  for (const [first, last] of rowRuns) {
    const y = first * rowHeight - offsetY
    const h = (last - first + 1) * rowHeight
    if (y < height && y + h > 0) {
      ctx.fillStyle = selectionFill
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = selectionBorder
      ctx.strokeRect(x, y, w, h)
    }
  }
}

/**
 * The overlay parts that come from the snapshot: a bordered band per run of
 * highlighted columns, then renderHighlights. The
 * live overlay draws these under the selected block and its hover and click
 * bands; the SVG export draws only these.
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
  const { colWidth, rowHeight, highlightedColumnRuns } = model
  renderReferenceRow(
    { ctx, rowHeight, top: -offsetY, x: 0, width, yMin: 0, yMax: height },
    model,
  )
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

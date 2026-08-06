import { useState } from 'react'

import type { MsaViewModel } from '../../model.ts'
import type React from 'react'

function eventToColRow({
  event,
  el,
  offsetX,
  offsetY,
  colWidth,
  rowHeight,
}: {
  event: React.MouseEvent
  el: HTMLElement
  offsetX: number
  offsetY: number
  colWidth: number
  rowHeight: number
}) {
  const { left, top } = el.getBoundingClientRect()
  return {
    col: Math.floor((event.clientX - left + offsetX) / colWidth),
    row: Math.floor((event.clientY - top + offsetY) / rowHeight),
  }
}

/**
 * Translates pointer events over one MSA block into model column/row hover and
 * click state, and reports where a tooltip should be anchored.
 *
 * The anchor is only tracked when there is something to show (an insertion, a
 * domain under the cursor, or column stats), so plain mouse movement over the
 * alignment updates the canvas overlay without re-rendering this component.
 */
export function useMsaBlockMouse({
  model,
  offsetX,
  offsetY,
}: {
  model: MsaViewModel
  offsetX: number
  offsetY: number
}) {
  const [tooltipPoint, setTooltipPoint] = useState<{ x: number; y: number }>()

  function colRow(event: React.MouseEvent, el: HTMLElement) {
    const { colWidth, rowHeight } = model
    return eventToColRow({ event, el, offsetX, offsetY, colWidth, rowHeight })
  }

  // a block can extend past the alignment (the last block is a full tile wide,
  // and the panel is taller than the rows when there are few of them), so a
  // pointer inside the block is not necessarily over a cell
  function inBounds({ col, row }: { col: number; row: number }) {
    return col >= 0 && col < model.numColumns && row >= 0 && row < model.numRows
  }

  function onMouseMove(event: React.MouseEvent, el: HTMLElement) {
    const pos = colRow(event, el)
    const hit = inBounds(pos)
    model.setMousePos(hit ? pos.col : undefined, hit ? pos.row : undefined)

    const hasTooltip =
      !!model.hoveredInsertion ||
      model.mouseOverDomains.length > 0 ||
      (model.showColumnStats && !!model.mouseOverColumnStats)
    setTooltipPoint(
      hasTooltip ? { x: event.clientX, y: event.clientY } : undefined,
    )
  }

  function onClick(event: React.MouseEvent, el: HTMLElement) {
    const pos = colRow(event, el)
    const { col, row } = pos
    const { mouseClickCol, mouseClickRow } = model
    // clicking the same cell again clears the pinned crosshair, and so does
    // clicking past the end of the alignment -- there is no cell to pin there
    const same = col === mouseClickCol && row === mouseClickRow
    const keep = inBounds(pos) && !same
    model.setMouseClickPos(keep ? col : undefined, keep ? row : undefined)
  }

  function onMouseLeave() {
    model.setMousePos()
    setTooltipPoint(undefined)
  }

  return { tooltipPoint, onMouseMove, onClick, onMouseLeave }
}

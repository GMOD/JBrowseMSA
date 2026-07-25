import { useState } from 'react'
import type React from 'react'

import type { MsaViewModel } from '../../model.ts'

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

  function onMouseMove(event: React.MouseEvent, el: HTMLElement) {
    const { col, row } = colRow(event, el)
    const inBounds =
      col >= 0 && col < model.numColumns && row >= 0 && row < model.numRows
    model.setMousePos(inBounds ? col : undefined, inBounds ? row : undefined)

    const hasTooltip =
      !!model.hoveredInsertion ||
      model.mouseOverDomains.length > 0 ||
      (model.showColumnStats && !!model.mouseOverColumnStats)
    setTooltipPoint(
      hasTooltip ? { x: event.clientX, y: event.clientY } : undefined,
    )
  }

  function onClick(event: React.MouseEvent, el: HTMLElement) {
    const { col, row } = colRow(event, el)
    const { mouseClickCol, mouseClickRow } = model
    // clicking the same cell again clears the pinned crosshair
    const same = col === mouseClickCol && row === mouseClickRow
    model.setMouseClickPos(same ? undefined : col, same ? undefined : row)
  }

  function onMouseLeave() {
    model.setMousePos()
    setTooltipPoint(undefined)
  }

  return { tooltipPoint, onMouseMove, onClick, onMouseLeave }
}

import { useRef } from 'react'

import { dragSelection, maxClickTravel } from '../selectionDrag.ts'
import { useHoverAnchor } from '../useHoverAnchor.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ClientPoint } from '../selectionDrag.ts'
import type React from 'react'

/**
 * Translates pointer events over one MSA block into model column/row hover and
 * click state, and reports where a tooltip should be anchored.
 *
 * The anchor is only tracked when there is something to show (an insertion or a
 * domain under the cursor), so plain mouse movement over the alignment updates
 * the canvas overlay without re-rendering this component. Each track tooltips
 * its own column statistics, and the header reads out the hovered row, residue
 * and position.
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
  const { anchor, hoverAt, clearAnchor } = useHoverAnchor<true>()
  const downAt = useRef<{ x: number; y: number }>(undefined)

  // The block's rect places its cells on the page. A drag keeps the mapping
  // it started with, so each point subtracts the scroll since then.
  function cellMapper(el: HTMLElement) {
    const { left, top } = el.getBoundingClientRect()
    const { scrollX, scrollY } = model
    return ({ clientX, clientY }: ClientPoint) => ({
      col: Math.floor(
        (clientX - left + offsetX - (model.scrollX - scrollX)) / model.colWidth,
      ),
      row: Math.floor(
        (clientY - top + offsetY - (model.scrollY - scrollY)) / model.rowHeight,
      ),
    })
  }

  function colRow(event: React.MouseEvent, el: HTMLElement) {
    return cellMapper(el)(event)
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
      !!model.hoveredInsertion || model.mouseOverDomains.length > 0
    hoverAt(event, hasTooltip || undefined)
  }

  // shift+drag selects a block; MSACanvas leaves a shifted press out of its
  // pan
  function onMouseDown(event: React.MouseEvent, el: HTMLElement) {
    downAt.current = { x: event.clientX, y: event.clientY }
    if (event.shiftKey && event.button === 0) {
      dragSelection(model, event, cellMapper(el))
    }
  }

  function onClick(event: React.MouseEvent, el: HTMLElement) {
    const down = downAt.current
    downAt.current = undefined
    if (
      down &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) >
        maxClickTravel
    ) {
      return
    }
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
    clearAnchor()
  }

  return { anchor, onMouseMove, onMouseDown, onClick, onMouseLeave }
}

import { isAlive } from '@jbrowse/mobx-state-tree'

import type { MsaViewModel } from '../model.ts'

// a press that travels further than this, in px, is a drag and not a click
export const maxClickTravel = 3

export interface ClientPoint {
  clientX: number
  clientY: number
}

/**
 * Follows a press through the window until its release, selecting the block
 * between the cell it started on and the cell under the pointer. The selection
 * starts once the pointer travels past `maxClickTravel`, so a press that stays
 * put reaches the click handlers unchanged. `cellAt` maps a client point to a
 * visible column and row index, or a column alone to select across every row.
 */
export function dragSelection(
  model: MsaViewModel,
  start: ClientPoint,
  cellAt: (point: ClientPoint) => { col: number; row?: number },
) {
  const anchor = cellAt(start)
  const { clientX, clientY } = start
  let dragging = false
  function onMove(event: MouseEvent) {
    dragging ||=
      Math.hypot(event.clientX - clientX, event.clientY - clientY) >
      maxClickTravel
    if (dragging && isAlive(model)) {
      model.selectBlock(anchor, cellAt(event))
    }
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

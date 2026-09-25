import { dragSelection } from '../selectionDrag.ts'
import { useHoverAnchor } from '../useHoverAnchor.ts'

import type { MsaViewModel } from '../../model.ts'
import type React from 'react'

/**
 * Translates pointer events over a track's row into the hovered column and a
 * tooltip anchor. The track shares the alignment's columns, so hovering it sets
 * the model's mouse column too and the alignment's hover band follows along. A
 * drag along the row selects the columns it covers across every row.
 *
 * `tooltip` off skips the anchor, so a track whose tooltip is turned off still
 * drives the hover band without re-rendering on every mouse move.
 */
export function useTrackHover({
  model,
  tooltip,
}: {
  model: MsaViewModel
  tooltip: boolean
}) {
  const { anchor, hoverAt, clearAnchor } = useHoverAnchor<number>()

  // the blocks are laid out in column space and scrolled by a transform on
  // their container, so the pointer's column comes off the untransformed row
  function colAt(clientX: number, left: number) {
    return Math.floor((clientX - left - model.scrollX) / model.colWidth)
  }

  function onMouseMove(event: React.MouseEvent, el: HTMLElement) {
    const col = colAt(event.clientX, el.getBoundingClientRect().left)
    const hit = col >= 0 && col < model.numColumns
    model.setMousePos(hit ? col : undefined, undefined)
    if (tooltip) {
      hoverAt(event, hit ? col : undefined)
    }
  }

  // a press on a track's canvas, which leaves out the resize divider under it.
  // The row takes the focus, so Escape reaches onMsaKey from there too
  function onMouseDown(event: React.MouseEvent, el: HTMLElement) {
    if (event.button === 0 && event.target instanceof HTMLCanvasElement) {
      event.preventDefault()
      el.focus({ preventScroll: true })
      const { left } = el.getBoundingClientRect()
      dragSelection(model, event, ({ clientX }) => ({
        col: colAt(clientX, left),
      }))
    }
  }

  function onMouseLeave() {
    clearAnchor()
    model.setMousePos(undefined, undefined)
  }

  return {
    anchor: tooltip ? anchor : undefined,
    onMouseMove,
    onMouseDown,
    onMouseLeave,
  }
}

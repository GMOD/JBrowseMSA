import { useHoverAnchor } from '../useHoverAnchor.ts'

import type { MsaViewModel } from '../../model.ts'
import type React from 'react'

/**
 * Translates pointer events over a track's row into the hovered column and a
 * tooltip anchor. The track shares the alignment's columns, so hovering it sets
 * the model's mouse column too and the alignment's hover band follows along.
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
  function onMouseMove(event: React.MouseEvent, el: HTMLElement) {
    const { colWidth, scrollX, numColumns } = model
    const { left } = el.getBoundingClientRect()
    const col = Math.floor((event.clientX - left - scrollX) / colWidth)
    const hit = col >= 0 && col < numColumns
    model.setMousePos(hit ? col : undefined, undefined)
    if (tooltip) {
      hoverAt(event, hit ? col : undefined)
    }
  }

  function onMouseLeave() {
    clearAnchor()
    model.setMousePos(undefined, undefined)
  }

  return { anchor: tooltip ? anchor : undefined, onMouseMove, onMouseLeave }
}

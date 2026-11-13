import { useRef } from 'react'

import { dragSelection, maxClickTravel } from '../selectionDrag.ts'
import { useHoverAnchor } from '../useHoverAnchor.ts'
import { bandAt } from './highlightBands.ts'

import type { MsaViewModel } from '../../model.ts'
import type { HighlightBand } from '../../types.ts'
import type React from 'react'

/**
 * Translates pointer events over a track's row into the hovered column and a
 * tooltip anchor, which also holds the pointer's point in the track's content
 * px so an arc track can pick the stroke under it. The track shares the alignment's columns, so hovering it sets
 * the model's mouse column too and the alignment's hover band follows along. A
 * drag along the row selects the columns it covers across every row.
 *
 * `tooltip` off skips the anchor, so a track whose tooltip is turned off still
 * drives the hover band without re-rendering on every mouse move.
 *
 * With `bands`, the highlights track's brackets, the pointer also picks the
 * bracket under it, a click selects that highlight's columns, and a double
 * click zooms to them.
 */
export interface TrackPointer {
  col: number
  x: number
  y: number
}

export function useTrackHover({
  model,
  tooltip,
  bands,
}: {
  model: MsaViewModel
  tooltip: boolean
  bands?: HighlightBand[]
}) {
  const { anchor, hoverAt, clearAnchor } = useHoverAnchor<TrackPointer>()
  const downAt = useRef<{ x: number; y: number }>(undefined)

  // the blocks are laid out in column space and scrolled by a transform on
  // their container, so the pointer's column comes off the untransformed row
  function colAt(clientX: number, left: number) {
    return Math.floor((clientX - left - model.scrollX) / model.colWidth)
  }

  function onMouseMove(event: React.MouseEvent, el: HTMLElement) {
    const { left, top } = el.getBoundingClientRect()
    const col = colAt(event.clientX, left)
    const hit = col >= 0 && col < model.numColumns
    const x = event.clientX - left - model.scrollX
    const y = event.clientY - top
    model.setMousePos(hit ? col : undefined, undefined)
    if (bands) {
      model.setHoveredHighlight(bandAt(bands, x, y, model.colWidth)?.key)
    }
    if (tooltip) {
      hoverAt(event, hit ? { col, x, y } : undefined)
    }
  }

  // a press on a track's canvas, which leaves out the resize divider under it.
  // The row takes the focus, so Escape reaches onMsaKey from there too
  function onMouseDown(event: React.MouseEvent, el: HTMLElement) {
    downAt.current = { x: event.clientX, y: event.clientY }
    if (event.button === 0 && event.target instanceof HTMLCanvasElement) {
      event.preventDefault()
      el.focus({ preventScroll: true })
      const { left } = el.getBoundingClientRect()
      dragSelection(model, event, ({ clientX }) => ({
        col: colAt(clientX, left),
      }))
    }
  }

  function onClick(event: React.MouseEvent) {
    const down = downAt.current
    downAt.current = undefined
    const band = bands?.find(b => b.key === model.hoveredHighlight)
    if (
      band &&
      down &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) <=
        maxClickTravel
    ) {
      model.selectBlock({ col: band.startCol }, { col: band.endCol })
    }
  }

  function onDoubleClick() {
    const { row, start, end } =
      model.resolvedHighlights.find(h => h.key === model.hoveredHighlight) ?? {}
    if (start !== undefined && end !== undefined) {
      model.zoomToRegion({ row, start, end })
    }
  }

  function onMouseLeave() {
    clearAnchor()
    model.setMousePos(undefined, undefined)
    if (bands) {
      model.setHoveredHighlight(undefined)
    }
  }

  return {
    anchor: tooltip ? anchor : undefined,
    onMouseMove,
    onMouseDown,
    onClick,
    onDoubleClick,
    onMouseLeave,
  }
}

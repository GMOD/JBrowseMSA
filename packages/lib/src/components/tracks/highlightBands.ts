import { colord } from 'colord'

import { packDomainLanes } from '../msa/packDomainLanes.ts'

import type { HighlightBand, ResolvedHighlight } from '../../types.ts'

export const highlightLaneHeight = 18
export const highlightLabelFontSize = 11
const labelInset = 4
// half the width of the triangle a single-residue highlight draws as
export const highlightMarkerHalfWidth = 4

export function highlightTrackHeight(bands: HighlightBand[]) {
  const lanes = Math.max(0, ...bands.map(b => b.lane + 1))
  return lanes * highlightLaneHeight + 2
}

/**
 * A highlight color drawn as a line or as text. Highlight colors are written
 * as fills, often a 15% wash, which as a 1px outline or a label is invisible.
 */
export function opaqueColor(color: string) {
  const parsed = colord(color)
  return parsed.isValid() ? parsed.alpha(1).toRgbString() : color
}

/**
 * The persisted bracket-mark highlights as bands packed into lanes by their
 * spans alone, so the strip keeps its height at every zoom. A label that does
 * not fit before the next bracket in its lane is left to the tooltip.
 */
export function packHighlightBands(highlights: ResolvedHighlight[]) {
  const spans = highlights.flatMap(
    ({ startCol, endCol, label, color, mark, transient, key }) =>
      startCol === undefined ||
      endCol === undefined ||
      mark !== 'bracket' ||
      transient
        ? []
        : [{ key, startCol, endCol: endCol + 1, label, color }],
  )
  const packed = packDomainLanes(spans)
  return packed.map(({ key, startCol, endCol, lane, label, color }) => {
    const next = packed
      .filter(b => b.lane === lane && b.startCol >= endCol)
      .map(b => b.startCol)
    return {
      key,
      startCol,
      endCol: endCol - 1,
      lane,
      nextStartCol: next.length > 0 ? Math.min(...next) : undefined,
      label,
      color,
    }
  })
}

/**
 * Where a band's label starts, or undefined where it does not fit. Inside the
 * bracket, held against the visible left edge while the bracket's start is
 * scrolled off; beside the marker of a single residue; and never past the
 * next bracket in the lane.
 */
export function highlightLabelX({
  band: { startCol, endCol, nextStartCol },
  labelWidth,
  colWidth,
  viewLeft,
}: {
  band: HighlightBand
  labelWidth: number
  colWidth: number
  viewLeft: number
}) {
  const x0 = startCol * colWidth
  const x1 = (endCol + 1) * colWidth
  const x =
    startCol === endCol
      ? x0 + colWidth / 2 + highlightMarkerHalfWidth + 2
      : Math.max(
          x0 + labelInset,
          Math.min(viewLeft + labelInset, x1 - labelWidth - labelInset),
        )
  const limit =
    nextStartCol === undefined ? Infinity : nextStartCol * colWidth - labelInset
  return x + labelWidth <= limit ? x : undefined
}

/**
 * The band under a point of the strip, `x` in content pixels and `y` from the
 * strip's top. A single residue's marker is wider than its column, so its
 * hit area is too.
 */
export function bandAt(
  bands: HighlightBand[] | undefined,
  x: number,
  y: number,
  colWidth: number,
) {
  const lane = Math.floor(y / highlightLaneHeight)
  return (bands ?? []).find(b => {
    const pad = b.startCol === b.endCol ? highlightMarkerHalfWidth : 0
    return (
      b.lane === lane &&
      x >= b.startCol * colWidth - pad &&
      x <= (b.endCol + 1) * colWidth + pad
    )
  })
}

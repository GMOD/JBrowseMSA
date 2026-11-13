import type { Arc } from '../../types.ts'

// how far from its stroke, in px, the pointer still picks an arc
export const arcPickTolerance = 3

export function arcMaxSpan(arcs: Arc[]) {
  let maxSpan = 1
  for (const arc of arcs) {
    maxSpan = Math.max(maxSpan, arc.end - arc.start)
  }
  return maxSpan
}

/**
 * An arc's apex scales with the square root of its span. Contact-map spans skew
 * short, and a linear scale flattens them along the baseline. A full-height
 * apex would put the stroke half outside the track, so the tallest stops 1px
 * short.
 */
export function arcApex(arc: Arc, maxSpan: number, trackHeight: number) {
  return (trackHeight - 1) * Math.sqrt((arc.end - arc.start) / maxSpan)
}

// an arc's stroke as an SVG path in content px, the curve drawArcs strokes
export function arcPath({
  arc,
  colWidth,
  maxSpan,
  trackHeight,
}: {
  arc: Arc
  colWidth: number
  maxSpan: number
  trackHeight: number
}) {
  const x1 = (arc.start + 0.5) * colWidth
  const x2 = (arc.end + 0.5) * colWidth
  const apexY = trackHeight - 2 * arcApex(arc, maxSpan, trackHeight)
  return `M${x1} ${trackHeight}Q${(x1 + x2) / 2} ${apexY} ${x2} ${trackHeight}`
}

/**
 * The y of an arc's stroke at content x, or undefined outside its feet. The
 * stroke is a quadratic curve from foot to foot with its control point at twice
 * the apex, so at fraction t of the way across it sits 4·apex·t·(1 − t) above
 * the baseline.
 */
export function arcStrokeY({
  arc,
  x,
  colWidth,
  maxSpan,
  trackHeight,
}: {
  arc: Arc
  x: number
  colWidth: number
  maxSpan: number
  trackHeight: number
}) {
  const x1 = (arc.start + 0.5) * colWidth
  const x2 = (arc.end + 0.5) * colWidth
  const t = (x - x1) / (x2 - x1)
  return t >= 0 && t <= 1
    ? trackHeight - 4 * arcApex(arc, maxSpan, trackHeight) * t * (1 - t)
    : undefined
}

/**
 * The arcs under the pointer at content point (x, y), nearest stroke first:
 * those whose stroke passes within `arcPickTolerance` px, then those with a
 * foot in the pointer's column.
 */
export function arcsAtPoint({
  arcs,
  x,
  y,
  colWidth,
  trackHeight,
  hidden,
}: {
  arcs: Arc[]
  x: number
  y: number
  colWidth: number
  trackHeight: number
  hidden?: (arc: Arc) => boolean
}) {
  const maxSpan = arcMaxSpan(arcs)
  const col = Math.floor(x / colWidth)
  return arcs
    .filter(arc => !hidden?.(arc))
    .map(arc => {
      const strokeY = arcStrokeY({ arc, x, colWidth, maxSpan, trackHeight })
      const distance = strokeY === undefined ? Infinity : Math.abs(strokeY - y)
      return {
        arc,
        distance:
          distance <= arcPickTolerance
            ? distance
            : arc.start === col || arc.end === col
              ? arcPickTolerance + 1
              : Infinity,
      }
    })
    .filter(({ distance }) => distance < Infinity)
    .toSorted((a, b) => a.distance - b.distance)
    .map(({ arc }) => arc)
}

import { minFeatureLabelHeight } from '../../constants.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { Annotation, NodeWithIdsAndLength } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

/** one drawn span: a feature, the lane it sits in, and its row's depth */
export interface SpanBand {
  annotation: Annotation
  lane: number
  laneCount: number
}

/** one row's spans, at the row baseline `y` the tree layout gives it */
export interface SpanRow<T extends SpanBand> {
  y: number
  bands: T[]
}

/**
 * Where a band lands inside its row. The alignment overlay fills the row, bars
 * it along the bottom, or stacks thin sub-rows; a `features` row panel divides
 * the row between its lanes.
 */
export interface SpanLayout {
  /** the band height in a row needing `laneCount` lanes */
  height: (laneCount: number) => number
  /** the band's top edge, from its row baseline, its lane and its height */
  top: (y: number, lane: number, height: number) => number
  /** how far a strand head reaches past the body */
  headLength: (height: number) => number
}

/** the rows of `bandsByRow` that `leaves` covers, in display order */
export function spanRows<T extends SpanBand>(
  leaves: HierarchyNode<NodeWithIdsAndLength>[],
  bandsByRow: Map<string, T[]>,
): SpanRow<T>[] {
  const rows: SpanRow<T>[] = []
  for (const leaf of leaves) {
    const bands = bandsByRow.get(leaf.data.name)
    if (bands && bands.length > 0) {
      rows.push({ y: leaf.x!, bands })
    }
  }
  return rows
}

/**
 * The span mark, in whatever x space the caller maps its bands into: alignment
 * columns for the domain overlay, panel pixels for a `features` row panel. A
 * feature with a strand draws as an arrow, one without as a box, and a label
 * draws inside the span wherever the text fits.
 *
 * `xOf` returns the span's `[xStart, xEnd]` in the context's coordinates, and
 * the context is translated so that `y - rowHeight` is the row's top edge.
 */
export function drawFeatureSpans<T extends SpanBand>({
  ctx,
  rows,
  layout,
  xOf,
  colors,
  labelOf,
  labelDrawn,
  contrastText,
  xMin,
  xMax,
}: {
  ctx: RenderCtx
  rows: SpanRow<T>[]
  layout: SpanLayout
  xOf: (band: T) => [number, number]
  colors: Map<Annotation, { fill: string; stroke: string }>
  labelOf?: (band: T) => string | undefined
  labelDrawn?: (band: T) => void
  contrastText: (color: string) => string
  xMin: number
  xMax: number
}) {
  for (const { y, bands } of rows) {
    const h = layout.height(bands[0]!.laneCount)
    const headLen = layout.headLength(h)
    const labelled = h >= minFeatureLabelHeight
    for (const band of bands) {
      const [xStart, xEnd] = xOf(band)
      const w = xEnd - xStart
      if (xEnd < xMin || xStart > xMax) {
        continue
      }
      const t = layout.top(y, band.lane, h)
      const { fill, stroke } = colors.get(band.annotation)!
      ctx.fillStyle = fill
      ctx.strokeStyle = stroke
      const { strand } = band.annotation
      if (strand === undefined) {
        ctx.fillRect(xStart, t, w, h)
        ctx.strokeRect(xStart, t, w, h)
      } else {
        drawGeneArrow({ ctx, x: xStart, t, w, h, headLen, strand })
      }
      const label = labelled ? labelOf?.(band) : undefined
      if (label !== undefined) {
        const fontSize = Math.min(h - 2, 11)
        ctx.font = `${fontSize}px sans-serif`
        if (ctx.measureText(label).width + 2 <= w) {
          labelDrawn?.(band)
          ctx.fillStyle = contrastText(fill)
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(label, xStart + w / 2, t + h / 2)
        }
      }
    }
  }
}

// A gene arrow: a full-width rectangular body spanning the feature's
// start..end columns, plus a triangular head that points *beyond* that end in
// the strand direction (right for +, left for -). Keeping the body aligned to
// the exact start/end columns means + and - strand features read as having the
// same boundaries; the arrow lives outside them purely to show transcription
// direction, preserving the column-by-column homology down the rows.
function drawGeneArrow({
  ctx,
  x,
  t,
  w,
  h,
  headLen,
  strand,
}: {
  ctx: RenderCtx
  x: number
  t: number
  w: number
  h: number
  headLen: number
  strand: number
}) {
  const dir = strand > 0 ? 1 : -1
  const bodyStart = strand > 0 ? x : x + w
  const bodyEnd = strand > 0 ? x + w : x
  ctx.beginPath()
  ctx.moveTo(bodyStart, t)
  ctx.lineTo(bodyEnd, t)
  ctx.lineTo(bodyEnd + dir * headLen, t + h / 2)
  ctx.lineTo(bodyEnd, t + h)
  ctx.lineTo(bodyStart, t + h)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

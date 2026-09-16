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
  /** how far back from the feature's end the head starts */
  headLength: (height: number) => number
  /**
   * how far the head rises above the band. A bar too thin to taper reads its
   * direction off a head taller than itself, and the bar sits on the row's
   * bottom edge, so the room is above.
   */
  headRise?: (height: number) => number
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
  // one row's spans are drawn before any of its labels. Bands are ordered
  // longest-first so a nested one lands on top, and drawing each label with its
  // own span put the child's box over the parent's text: `S` covered `RBD`, and
  // `RBD` read as `RB`. Reused across rows rather than allocated per row.
  const placed: {
    band: T
    xStart: number
    w: number
    t: number
    head: number
    fill: string
  }[] = []

  for (const { y, bands } of rows) {
    const h = layout.height(bands[0]!.laneCount)
    const headLen = layout.headLength(h)
    const rise = layout.headRise?.(h) ?? 0
    const labelled = labelOf !== undefined && h >= minFeatureLabelHeight
    placed.length = 0

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
      const head = strand === undefined ? 0 : Math.min(headLen, w)
      if (strand === undefined) {
        ctx.fillRect(xStart, t, w, h)
        ctx.strokeRect(xStart, t, w, h)
      } else {
        drawGeneArrow({ ctx, x: xStart, t, w, h, head, rise, strand })
      }
      if (labelled) {
        placed.push({ band, xStart, w, t, head, fill })
      }
    }

    if (placed.length > 0) {
      ctx.font = `${Math.min(h - 2, 11)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const { band, xStart, w, t, head, fill } of placed) {
        // asking for the label here rather than in the pass above keeps the
        // once-per-block segment numbering in drawing order
        const label = labelOf!(band)
        // the head narrows to a point, so only about half of it holds text
        if (
          label !== undefined &&
          ctx.measureText(label).width + 2 <= w - head / 2
        ) {
          labelDrawn?.(band)
          ctx.fillStyle = contrastText(fill)
          ctx.fillText(label, xStart + w / 2, t + h / 2)
        }
      }
    }
  }
}

/**
 * A gene arrow, drawn the way gggenes and gggenomes draw one: the head is the
 * last `head` pixels *of* the feature, tapering to a point at its end, and a
 * feature shorter than the head is all head. The glyph therefore covers its
 * start..end span and nothing else, so adjacent genes butt together instead of
 * biting triangles out of each other, a neighbour never draws over a label, and
 * a gene 20 columns wide reads as 20 columns wide.
 *
 * `rise` lifts the head above the band, for a bar too thin to taper.
 */
function drawGeneArrow({
  ctx,
  x,
  t,
  w,
  h,
  head,
  rise,
  strand,
}: {
  ctx: RenderCtx
  x: number
  t: number
  w: number
  h: number
  head: number
  rise: number
  strand: number
}) {
  const tip = strand > 0 ? x + w : x
  const tail = strand > 0 ? x : x + w
  const flange = strand > 0 ? tip - head : tip + head
  const bottom = t + h
  const crown = t - rise
  const point = (crown + bottom) / 2
  ctx.beginPath()
  if (head >= w) {
    ctx.moveTo(tail, crown)
    ctx.lineTo(tip, point)
    ctx.lineTo(tail, bottom)
  } else {
    ctx.moveTo(tail, t)
    ctx.lineTo(flange, t)
    if (rise > 0) {
      ctx.lineTo(flange, crown)
    }
    ctx.lineTo(tip, point)
    ctx.lineTo(flange, bottom)
    ctx.lineTo(tail, bottom)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

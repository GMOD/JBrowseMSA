import { minFeatureLabelHeight } from '../../constants.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { Annotation, NodeWithIds } from '../../types.ts'
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

/**
 * What a renderer hands the span mark: its rows, where a band lands in them,
 * its x mapping, the colors and the label each feature takes.
 */
export interface SpanSource<T extends SpanBand> {
  rows: SpanRow<T>[]
  layout: SpanLayout
  xOf: (band: T) => [number, number]
  colors: Map<Annotation, { fill: string; stroke: string }>
  labelOf?: (band: T) => string | undefined
  labelDrawn?: (band: T) => void
}

/** a span as drawn: a box, or an arrow's outline where it carries a strand */
export interface SpanShape<T extends SpanBand> {
  band: T
  fill: string
  stroke: string
  box?: { x: number; y: number; w: number; h: number }
  outline?: [number, number][]
}

export interface SpanLabel {
  text: string
  x: number
  y: number
  fill: string
}

/** one row's shapes, then the labels drawn over them at `fontSize` */
export interface SpanMarkRow<T extends SpanBand> {
  shapes: SpanShape<T>[]
  labels: SpanLabel[]
  fontSize: number
}

/** the rows of `bandsByRow` that `leaves` covers, in display order */
export function spanRows<T extends SpanBand>(
  leaves: HierarchyNode<NodeWithIds>[],
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
 * The span mark as geometry, in whatever x space `xOf` maps its bands into:
 * alignment columns for the domain overlay, panel pixels for a `features` row
 * panel. A feature with a strand is an arrow, one without a box, and a label
 * lands inside the span wherever `measureText` says the text fits.
 *
 * `y - rowHeight` is the row's top edge in the coordinates `rows` gives.
 */
export function featureSpanMarks<T extends SpanBand>({
  rows,
  layout,
  xOf,
  colors,
  labelOf,
  labelDrawn,
  measureText,
  xMin,
  xMax,
}: SpanSource<T> & {
  measureText: (text: string, fontSize: number) => number
  xMin: number
  xMax: number
}): SpanMarkRow<T>[] {
  const out: SpanMarkRow<T>[] = []
  for (const { y, bands } of rows) {
    const h = layout.height(bands[0]!.laneCount)
    const headLen = layout.headLength(h)
    const rise = layout.headRise?.(h) ?? 0
    const labelled = labelOf !== undefined && h >= minFeatureLabelHeight
    const fontSize = Math.min(h - 2, 11)
    const shapes: SpanShape<T>[] = []
    const labels: SpanLabel[] = []
    // one row's spans are drawn before any of its labels. Bands are ordered
    // longest-first so a nested one lands on top, and drawing each label with
    // its own span put the child's box over the parent's text: `S` covered
    // `RBD`, and `RBD` read as `RB`.
    const placed: {
      band: T
      xStart: number
      w: number
      t: number
      head: number
      fill: string
    }[] = []

    for (const band of bands) {
      const [xStart, xEnd] = xOf(band)
      const w = xEnd - xStart
      if (xEnd < xMin || xStart > xMax) {
        continue
      }
      const t = layout.top(y, band.lane, h)
      const { fill, stroke } = colors.get(band.annotation)!
      const { strand } = band.annotation
      const head = strand === undefined ? 0 : Math.min(headLen, w)
      shapes.push(
        strand === undefined
          ? { band, fill, stroke, box: { x: xStart, y: t, w, h } }
          : {
              band,
              fill,
              stroke,
              outline: geneArrow({ x: xStart, t, w, h, head, rise, strand }),
            },
      )
      if (labelled) {
        placed.push({ band, xStart, w, t, head, fill })
      }
    }

    for (const { band, xStart, w, t, head, fill } of placed) {
      // asking for the label here rather than in the pass above keeps the
      // once-per-block segment numbering in drawing order
      const text = labelOf!(band)
      // the head narrows to a point, so only about half of it holds text
      if (
        text !== undefined &&
        measureText(text, fontSize) + 2 <= w - head / 2
      ) {
        labelDrawn?.(band)
        labels.push({ text, x: xStart + w / 2, y: t + h / 2, fill })
      }
    }
    out.push({ shapes, labels, fontSize })
  }
  return out
}

/**
 * The span mark, drawn into `ctx` from `featureSpanMarks`, with the context
 * translated so that `y - rowHeight` is the row's top edge.
 */
export function drawFeatureSpans<T extends SpanBand>({
  ctx,
  contrastText,
  ...source
}: SpanSource<T> & {
  ctx: RenderCtx
  contrastText: (color: string) => string
  xMin: number
  xMax: number
}) {
  let font = ''
  const setFont = (fontSize: number) => {
    const next = `${fontSize}px sans-serif`
    if (next !== font) {
      ctx.font = next
      font = next
    }
  }
  const rows = featureSpanMarks({
    ...source,
    measureText: (text, fontSize) => {
      setFont(fontSize)
      return ctx.measureText(text).width
    },
  })
  for (const { shapes, labels, fontSize } of rows) {
    for (const { fill, stroke, box, outline } of shapes) {
      ctx.fillStyle = fill
      ctx.strokeStyle = stroke
      if (box) {
        ctx.fillRect(box.x, box.y, box.w, box.h)
        ctx.strokeRect(box.x, box.y, box.w, box.h)
      } else if (outline) {
        ctx.beginPath()
        ctx.moveTo(...outline[0]!)
        for (let i = 1; i < outline.length; i++) {
          ctx.lineTo(...outline[i]!)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    if (labels.length > 0) {
      setFont(fontSize)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const { text, x, y, fill } of labels) {
        ctx.fillStyle = contrastText(fill)
        ctx.fillText(text, x, y)
      }
    }
  }
}

/**
 * A gene arrow's outline, the way gggenes and gggenomes draw one: the head is
 * the last `head` pixels *of* the feature, tapering to a point at its end, and
 * a feature shorter than the head is all head. The glyph therefore covers its
 * start..end span and nothing else, so adjacent genes butt together instead of
 * biting triangles out of each other, a neighbour never draws over a label, and
 * a gene 20 columns wide reads as 20 columns wide.
 *
 * `rise` lifts the head above the band, for a bar too thin to taper.
 */
function geneArrow({
  x,
  t,
  w,
  h,
  head,
  rise,
  strand,
}: {
  x: number
  t: number
  w: number
  h: number
  head: number
  rise: number
  strand: number
}): [number, number][] {
  const tip = strand > 0 ? x + w : x
  const tail = strand > 0 ? x : x + w
  const flange = strand > 0 ? tip - head : tip + head
  const bottom = t + h
  const crown = t - rise
  const point = (crown + bottom) / 2
  if (head >= w) {
    return [
      [tail, crown],
      [tip, point],
      [tail, bottom],
    ]
  }
  return [
    [tail, t],
    [flange, t],
    ...(rise > 0 ? [[flange, crown] as [number, number]] : []),
    [tip, point],
    [flange, bottom],
    [tail, bottom],
  ]
}

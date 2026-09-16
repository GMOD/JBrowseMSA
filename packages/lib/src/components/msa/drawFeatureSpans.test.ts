// The span mark's geometry. A gene arrow covers its feature's span and nothing
// past it, which is what lets the genes of an operon butt together instead of
// biting triangles out of each other.
import { expect, test } from 'vitest'

import { drawFeatureSpans } from './drawFeatureSpans.ts'

import type { Annotation } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { SpanBand, SpanLayout } from './drawFeatureSpans.ts'

function annotation(start: number, end: number, strand?: number): Annotation {
  return {
    id: 'row',
    accession: `f${start}`,
    name: `f${start}`,
    description: '',
    start,
    end,
    strand,
  }
}

const layout: SpanLayout = {
  height: () => 20,
  top: y => y,
  headLength: h => h,
}

// every point the mark puts on the canvas for one band, arrow or box
function pointsOf(band: SpanBand, over: Partial<SpanLayout> = {}) {
  const points: [number, number][] = []
  const ctx = {
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    moveTo: (x: number, y: number) => points.push([x, y]),
    lineTo: (x: number, y: number) => points.push([x, y]),
    fillRect: (x: number, y: number, w: number, h: number) => {
      points.push([x, y], [x + w, y + h])
    },
    strokeRect() {},
  } as unknown as RenderCtx

  drawFeatureSpans({
    ctx,
    rows: [{ y: 0, bands: [band] }],
    layout: { ...layout, ...over },
    xOf: b => [b.annotation.start, b.annotation.end],
    colors: new Map([[band.annotation, { fill: '#fff', stroke: '#000' }]]),
    contrastText: () => '#000',
    xMin: -1000,
    xMax: 1000,
  })
  return points
}

test('an arrow head points at the feature end and stops there', () => {
  const band = { annotation: annotation(100, 200, 1), lane: 0, laneCount: 1 }
  const points = pointsOf(band)
  expect(Math.min(...points.map(([x]) => x))).toBe(100)
  expect(Math.max(...points.map(([x]) => x))).toBe(200)
  // the head takes the last band height of the span, and the tip is the one
  // point at mid height
  expect(points.filter(([, y]) => y === 10)).toEqual([[200, 10]])
  expect(points.filter(([x]) => x === 180)).toHaveLength(2)
})

test('a minus-strand arrow is the mirror of a plus-strand one', () => {
  const plus = pointsOf({
    annotation: annotation(100, 200, 1),
    lane: 0,
    laneCount: 1,
  })
  const minus = pointsOf({
    annotation: annotation(100, 200, -1),
    lane: 0,
    laneCount: 1,
  })
  expect(minus.map(([x, y]) => [300 - x, y])).toEqual(plus)
})

test('a feature shorter than the head is all head', () => {
  const points = pointsOf({
    annotation: annotation(100, 108, 1),
    lane: 0,
    laneCount: 1,
  })
  expect(points).toEqual([
    [100, 0],
    [108, 10],
    [100, 20],
  ])
})

test('a head rise lifts the point above the band without deepening it', () => {
  const points = pointsOf(
    { annotation: annotation(100, 200, 1), lane: 0, laneCount: 1 },
    { height: () => 4, headLength: () => 10, headRise: () => 6 },
  )
  expect(points).toEqual([
    [100, 0],
    [190, 0],
    [190, -6],
    [200, -1],
    [190, 4],
    [100, 4],
  ])
})

test('a feature with no strand draws as a box', () => {
  const points = pointsOf({
    annotation: annotation(100, 200),
    lane: 0,
    laneCount: 1,
  })
  expect(points).toEqual([
    [100, 0],
    [200, 20],
  ])
})

// what the canvas was asked to do, in order, for one row of nested features
function traceOf(bands: SpanBand[], labels: Map<Annotation, string>) {
  const trace: string[] = []
  const ctx = {
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    strokeRect() {},
    fillRect: (x: number) => trace.push(`box@${x}`),
    measureText: (text: string) => ({ width: text.length * 5 }),
    fillText: (text: string) => trace.push(`text:${text}`),
  } as unknown as RenderCtx

  drawFeatureSpans({
    ctx,
    rows: [{ y: 0, bands }],
    layout,
    xOf: b => [b.annotation.start, b.annotation.end],
    colors: new Map(
      bands.map(b => [b.annotation, { fill: '#fff', stroke: '#000' }]),
    ),
    labelOf: b => labels.get(b.annotation),
    contrastText: () => '#000',
    xMin: -1000,
    xMax: 1000,
  })
  return trace
}

test('a nested feature is drawn before the label of the one it sits in', () => {
  // S carries RBD inside it, which carries RBM. Bands arrive longest-first so
  // each nested box paints over the wider one, and drawing a label with its own
  // box left `RBD` reading as `RB`.
  const outer = annotation(0, 400)
  const middle = annotation(100, 260)
  const inner = annotation(150, 220)
  const band = (a: Annotation) => ({ annotation: a, lane: 0, laneCount: 1 })

  expect(
    traceOf(
      [band(outer), band(middle), band(inner)],
      new Map([
        [outer, 'S'],
        [middle, 'RBD'],
        [inner, 'RBM'],
      ]),
    ),
  ).toEqual(['box@0', 'box@100', 'box@150', 'text:S', 'text:RBD', 'text:RBM'])
})

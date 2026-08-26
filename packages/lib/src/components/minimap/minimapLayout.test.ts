// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

// wide enough to overflow horizontally, tall enough to raise the vertical
// scrollbar — which takes 20px out of the width the alignment actually draws on
function makeModel() {
  const names = Array.from({ length: 60 }, (_, i) => `s${i}`)
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    data: { msa: names.map(n => `>${n}\n${'ACGT'.repeat(50)}`).join('\n') },
  })
  model.setWidth(1000)
  return model
}

test('the viewport rectangle scales by the canvas width, not the msa area', () => {
  const model = makeModel()
  expect(model.showVerticalScrollbar).toBe(true)
  expect(model.msaCanvasWidth).toBe(model.msaAreaWidth - 20)

  const { unit, s, w } = getMinimapLayout(model)
  expect(unit).toBeCloseTo(model.msaCanvasWidth / model.totalWidth)
  // unscrolled, the rectangle starts at the left edge and covers the fraction
  // of the alignment on screen. Sizing it by msaAreaWidth instead overstated
  // that fraction by the scrollbar's width.
  expect(s).toBeCloseTo(0)
  expect(w).toBeCloseTo(
    (model.msaCanvasWidth / model.totalWidth) * model.msaCanvasWidth,
  )
})

test('the rectangle tracks scrollX and the trapezoid spans the bar', () => {
  const model = makeModel()
  model.setScrollX(-300)

  const { msaCanvasWidth: width } = model
  const { s, polygonHeight, polygonPoints } = getMinimapLayout(model)
  expect(s).toBeCloseTo((300 / model.totalWidth) * width)
  expect(polygonHeight).toBe(model.minimapHeight - MINIMAP_BAR_HEIGHT)
  // bottom edge spans the full minimap, top edge is the viewport rectangle
  expect(
    polygonPoints.endsWith(`0,${polygonHeight} ${width},${polygonHeight}`),
  ).toBe(true)
})

test('an alignment that already fits never overflows the bar', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: '>a\nACGT\n>b\nACGT' },
  })
  model.setWidth(1000)
  expect(model.totalWidth).toBeLessThan(model.msaCanvasWidth)
  expect(getMinimapLayout(model).w).toBe(model.msaCanvasWidth)
})

test('an empty alignment collapses to a zero-width unit instead of dividing by zero', () => {
  const model = MSAModelF().create({ type: 'MsaView' })
  model.setWidth(1000)
  expect(model.totalWidth).toBe(0)
  const { unit, s, w } = getMinimapLayout(model)
  expect(unit).toBe(0)
  expect(s).toBeCloseTo(0)
  // still clamped to the minimum grabbable width
  expect(w).toBe(20)
})

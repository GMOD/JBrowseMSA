import { expect, test } from 'vitest'

import { arcPath, arcStrokeY, arcsAtPoint } from './arcGeometry.ts'

// at colWidth 10 a foot sits mid-column: column 0 at x 5, column 20 at x 205
const long = { start: 0, end: 20, name: 'long' }
const short = { start: 0, end: 5, name: 'short' }
const trackHeight = 41

test('the longest arc peaks 1px under the top of the track', () => {
  expect(
    arcStrokeY({ arc: long, x: 105, colWidth: 10, maxSpan: 20, trackHeight }),
  ).toBe(1)
  expect(
    arcStrokeY({ arc: long, x: 5, colWidth: 10, maxSpan: 20, trackHeight }),
  ).toBe(trackHeight)
  expect(
    arcStrokeY({ arc: long, x: 300, colWidth: 10, maxSpan: 20, trackHeight }),
  ).toBeUndefined()
})

test('the pointer picks the arc whose stroke it is on', () => {
  const pick = (x: number, y: number) =>
    arcsAtPoint({ arcs: [long, short], x, y, colWidth: 10, trackHeight }).map(
      arc => arc.name,
    )
  expect(pick(105, 2)).toEqual(['long'])
  expect(pick(105, 20)).toEqual([])
  // mid-span the short arc's stroke sits at y 21, its apex sqrt(5/20) of the
  // long one's, and the long arc passes 2.5px under it there
  expect(pick(30, 21)).toEqual(['short', 'long'])
  expect(pick(30, 19)).toEqual(['short'])
})

test('a pointer in an arc s foot column picks it off the stroke too', () => {
  expect(
    arcsAtPoint({ arcs: [long], x: 204, y: 5, colWidth: 10, trackHeight }),
  ).toEqual([long])
})

test('a hidden arc is never picked', () => {
  expect(
    arcsAtPoint({
      arcs: [long],
      x: 105,
      y: 1,
      colWidth: 10,
      trackHeight,
      hidden: arc => arc.name === 'long',
    }),
  ).toEqual([])
})

test('the arc path runs foot to foot with its control point at twice the apex', () => {
  expect(arcPath({ arc: long, colWidth: 10, maxSpan: 20, trackHeight })).toBe(
    'M5 41Q105 -39 205 41',
  )
})

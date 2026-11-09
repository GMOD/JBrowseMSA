import { expect, test } from 'vitest'

import {
  bandAt,
  highlightLabelX,
  highlightMarkerHalfWidth,
  opaqueColor,
  packHighlightBands,
} from './highlightBands.ts'

import type { HighlightMark, ResolvedHighlight } from '../../types.ts'

function span(
  label: string,
  startCol: number,
  endCol: number,
  extra: { mark?: HighlightMark; transient?: boolean } = {},
): ResolvedHighlight {
  return {
    label,
    startCol,
    endCol,
    rowIndices: [],
    mark: 'bracket',
    transient: false,
    key: label,
    ...extra,
  }
}

test('a nested bracket takes the next lane, and adjacent ones share a lane', () => {
  const bands = packHighlightBands([
    span('RBD', 10, 50),
    span('RBM', 20, 30),
    span('S2', 51, 90),
  ])
  expect(bands.map(b => [b.key, b.lane])).toEqual([
    ['RBD', 0],
    ['RBM', 1],
    ['S2', 0],
  ])
  expect(bands.find(b => b.key === 'RBD')?.nextStartCol).toBe(51)
  expect(bands.find(b => b.key === 'S2')?.nextStartCol).toBeUndefined()
})

test('bands and transient highlights stay out of the strip', () => {
  const bands = packHighlightBands([
    span('band', 0, 5, { mark: 'band' }),
    span('hover', 0, 5, { transient: true }),
    span('kept', 0, 5),
  ])
  expect(bands.map(b => b.key)).toEqual(['kept'])
})

test('a label holds to the visible left edge and stops at the bracket end', () => {
  const band = { key: 'a', startCol: 0, endCol: 99, lane: 0 }
  expect(
    highlightLabelX({ band, labelWidth: 30, colWidth: 10, viewLeft: 0 }),
  ).toBe(4)
  expect(
    highlightLabelX({ band, labelWidth: 30, colWidth: 10, viewLeft: 500 }),
  ).toBe(504)
  expect(
    highlightLabelX({ band, labelWidth: 30, colWidth: 10, viewLeft: 990 }),
  ).toBe(1000 - 30 - 4)
})

test('a label wider than its bracket starts past the end tick', () => {
  const band = { key: 'furin', startCol: 10, endCol: 11, lane: 0 }
  expect(
    highlightLabelX({ band, labelWidth: 80, colWidth: 20, viewLeft: 0 }),
  ).toBe(12 * 20 + 4)
})

test('a label that would run into the next bracket in its lane is dropped', () => {
  const band = { key: 'a', startCol: 10, endCol: 10, lane: 0, nextStartCol: 12 }
  expect(
    highlightLabelX({ band, labelWidth: 40, colWidth: 2, viewLeft: 0 }),
  ).toBeUndefined()
  expect(
    highlightLabelX({ band, labelWidth: 40, colWidth: 40, viewLeft: 0 }),
  ).toBe(10 * 40 + 20 + highlightMarkerHalfWidth + 2)
})

test('a single residue is hit across its marker, wider than its column', () => {
  const bands = [{ key: 'R175', startCol: 10, endCol: 10, lane: 1 }]
  expect(bandAt(bands, 10 * 2 - 3, 18 + 5, 2)?.key).toBe('R175')
  expect(bandAt(bands, 10 * 2 - 3, 5, 2)).toBeUndefined()
  expect(bandAt(bands, 40, 18 + 5, 2)).toBeUndefined()
})

test('a translucent fill color draws opaque as a line or a label', () => {
  expect(opaqueColor('rgba(0,120,255,0.25)')).toBe('rgb(0, 120, 255)')
  expect(opaqueColor('#ff000040')).toBe('rgb(255, 0, 0)')
  expect(opaqueColor('steelblue')).toBe('steelblue')
})

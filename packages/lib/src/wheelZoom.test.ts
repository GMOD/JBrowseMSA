import { describe, expect, test } from 'vitest'

import {
  getZoomNormalizer,
  normalizeWheelDelta,
  zoomFactorFromAccum,
} from './wheelZoom.ts'

describe('normalizeWheelDelta', () => {
  test('pixel mode passes through', () => {
    expect(normalizeWheelDelta(120, 0)).toBe(120)
  })
  test('line mode scales to pixels', () => {
    expect(normalizeWheelDelta(3, 1)).toBe(48)
  })
  test('page mode scales to pixels', () => {
    expect(normalizeWheelDelta(2, 2)).toBe(200)
  })
})

describe('getZoomNormalizer', () => {
  test('tiny pinch deltas get the smallest divisor (largest step)', () => {
    expect(getZoomNormalizer(3)).toBe(25)
  })
  test('large mouse notches get the largest divisor (finest step)', () => {
    expect(getZoomNormalizer(200)).toBe(500)
  })
  test('medium deltas land in between', () => {
    expect(getZoomNormalizer(50)).toBe(150)
    expect(getZoomNormalizer(20)).toBe(75)
  })
})

describe('zoomFactorFromAccum', () => {
  test('negative accum zooms in (factor > 1)', () => {
    expect(zoomFactorFromAccum(-0.1, 16.67)).toBeCloseTo(1.1)
  })
  test('positive accum zooms out (factor < 1)', () => {
    expect(zoomFactorFromAccum(0.1, 16.67)).toBeCloseTo(1 / 1.1)
  })
  test('rate-limits a big burst to ~0.2 per frame', () => {
    // a huge accumulated delta cannot zoom more than the per-frame cap
    expect(zoomFactorFromAccum(99, 16.67)).toBeCloseTo(1 / 1.2, 2)
    expect(zoomFactorFromAccum(-99, 16.67)).toBeCloseTo(1.2, 2)
  })
})

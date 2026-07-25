import { describe, expect, test } from 'vitest'

import { columnCountsFromColumns } from './columnCounts.ts'
import { calculatePropertyConservation } from './propertyConservation.ts'

function propertyConservation(columns: string[]) {
  return calculatePropertyConservation(columnCountsFromColumns(columns))
}

describe('property conservation', () => {
  test('an invariant column scores 1', () => {
    expect(propertyConservation(['LLLL'])[0]).toBe(1)
  })

  test('a column varying only within one property class stays fully conserved', () => {
    // L/I/V/M are all hydrophobic: identity varies but the property does not
    expect(propertyConservation(['LIVM'])[0]).toBe(1)
  })

  test('mixing opposite-charge classes lowers the score', () => {
    // K/R (positive) vs D/E (negative): two equally-sized classes
    const score = propertyConservation(['KRDE'])[0]!
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  test('gaps reduce the score proportionally', () => {
    const full = propertyConservation(['LLLL'])[0]!
    const halfGapped = propertyConservation(['LL--'])[0]!
    expect(halfGapped).toBeCloseTo(full * 0.5)
  })

  test('an all-gap column scores 0', () => {
    expect(propertyConservation(['----'])[0]).toBe(0)
  })
})

import { describe, expect, test } from 'vitest'

import { seqCoordToRowSpecificGlobalCoord } from './seqCoordToRowSpecificGlobalCoord'

describe('seqCoordToRowSpecificGlobalCoord', () => {
  test('converts sequence coordinate to global coordinate with no gaps', () => {
    const row = 'ATGCATGC'
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 3 })).toBe(3)
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 0 })).toBe(0)
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 8 })).toBe(8)
  })

  test('converts sequence coordinate to global coordinate with gaps', () => {
    const row = 'A-TG-CA-TGC'
    // A(0) -(1) T(2) G(3) -(4) C(5) A(6) -(7) T(8) G(9) C(10)
    // Sequence positions: A(0) T(1) G(2) C(3) A(4) T(5) G(6) C(7)

    // Position 0 (first A) -> Global index 0
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 0 })).toBe(0)

    // Position 1 (T after first gap) -> Global index 2
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 1 })).toBe(2)

    // Position 3 (C after second gap) -> Global index 5
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 3 })).toBe(5)

    // Position 5 (T after third gap) -> Global index 8
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 5 })).toBe(8)

    // Position 8 (end of sequence) -> Global index 11
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 8 })).toBe(11)
  })

  test('handles empty row', () => {
    expect(seqCoordToRowSpecificGlobalCoord({ row: '', position: 0 })).toBe(0)
  })

  test('handles row with only gaps', () => {
    const row = '---..--'
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 0 })).toBe(0)
  })

  test('handles mixed gap characters', () => {
    const row = 'A-.G-C.'
    // A(0) -(1) .(2) G(3) -(4) C(5) .(6)
    // Sequence positions: A(0) G(1) C(2)

    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 0 })).toBe(0)
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 1 })).toBe(3)
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 2 })).toBe(5)
    expect(seqCoordToRowSpecificGlobalCoord({ row, position: 3 })).toBe(7)
  })
})

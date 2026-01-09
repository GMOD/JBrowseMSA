import { describe, expect, test } from 'vitest'

import { seqPosToGlobalCol } from './seqPosToGlobalCol'

describe('seqPosToGlobalCol', () => {
  test('converts sequence position to global column with no gaps', () => {
    const row = 'ATGCATGC'
    expect(seqPosToGlobalCol({ row, seqPos: 0 })).toBe(0)
    expect(seqPosToGlobalCol({ row, seqPos: 3 })).toBe(3)
    expect(seqPosToGlobalCol({ row, seqPos: 7 })).toBe(7)
    expect(seqPosToGlobalCol({ row, seqPos: 8 })).toBe(8) // Past end
  })

  test('converts sequence position to global column with gaps', () => {
    const row = 'A-TG-CA-TGC'
    // Global: A(0) -(1) T(2) G(3) -(4) C(5) A(6) -(7) T(8) G(9) C(10)
    // SeqPos: A(0)      T(1) G(2)      C(3) A(4)      T(5) G(6) C(7)

    expect(seqPosToGlobalCol({ row, seqPos: 0 })).toBe(0) // A
    expect(seqPosToGlobalCol({ row, seqPos: 1 })).toBe(2) // T
    expect(seqPosToGlobalCol({ row, seqPos: 2 })).toBe(3) // G
    expect(seqPosToGlobalCol({ row, seqPos: 3 })).toBe(5) // C
    expect(seqPosToGlobalCol({ row, seqPos: 4 })).toBe(6) // A
    expect(seqPosToGlobalCol({ row, seqPos: 5 })).toBe(8) // T
    expect(seqPosToGlobalCol({ row, seqPos: 6 })).toBe(9) // G
    expect(seqPosToGlobalCol({ row, seqPos: 7 })).toBe(10) // C
    expect(seqPosToGlobalCol({ row, seqPos: 8 })).toBe(11) // Past end
  })

  test('handles empty row', () => {
    expect(seqPosToGlobalCol({ row: '', seqPos: 0 })).toBe(0)
  })

  test('handles row with only gaps', () => {
    const row = '---..--'
    expect(seqPosToGlobalCol({ row, seqPos: 0 })).toBe(0)
    expect(seqPosToGlobalCol({ row, seqPos: 1 })).toBe(7) // Past end
  })

  test('handles mixed gap characters (- and .)', () => {
    const row = 'A-.G-C.'
    // Global: A(0) -(1) .(2) G(3) -(4) C(5) .(6)
    // SeqPos: A(0)           G(1)      C(2)

    expect(seqPosToGlobalCol({ row, seqPos: 0 })).toBe(0) // A
    expect(seqPosToGlobalCol({ row, seqPos: 1 })).toBe(3) // G
    expect(seqPosToGlobalCol({ row, seqPos: 2 })).toBe(5) // C
    expect(seqPosToGlobalCol({ row, seqPos: 3 })).toBe(7) // Past end
  })

  test('handles leading gaps', () => {
    const row = '--ACG'
    // Global: -(0) -(1) A(2) C(3) G(4)
    // SeqPos:           A(0) C(1) G(2)

    expect(seqPosToGlobalCol({ row, seqPos: 0 })).toBe(2) // A
    expect(seqPosToGlobalCol({ row, seqPos: 1 })).toBe(3) // C
    expect(seqPosToGlobalCol({ row, seqPos: 2 })).toBe(4) // G
  })

  test('handles trailing gaps', () => {
    const row = 'ACG--'
    // Global: A(0) C(1) G(2) -(3) -(4)
    // SeqPos: A(0) C(1) G(2)

    expect(seqPosToGlobalCol({ row, seqPos: 0 })).toBe(0) // A
    expect(seqPosToGlobalCol({ row, seqPos: 1 })).toBe(1) // C
    expect(seqPosToGlobalCol({ row, seqPos: 2 })).toBe(2) // G
    expect(seqPosToGlobalCol({ row, seqPos: 3 })).toBe(5) // Past end
  })
})

import { expect, test } from 'vitest'

import {
  globalColToSeqPos,
  globalColToVisibleCol,
  visibleColToGlobalCol,
  visibleColToSeqPos,
} from './rowCoordinateCalculations'

// Tests for visibleColToGlobalCol (visible → global)
test('visibleColToGlobalCol with blanks at positions [2, 5, 8]', () => {
  const blanks = [2, 5, 8]
  ;(
    [
      [0, 0],
      [1, 1],
      [2, 3],
      [3, 4],
      [4, 6],
      [5, 7],
      [6, 9],
      [7, 10],
    ] as const
  ).forEach(r => {
    expect(visibleColToGlobalCol(blanks, r[0])).toBe(r[1])
  })
})

test('visibleColToGlobalCol with no blanks', () => {
  const blanks: number[] = []
  ;(
    [
      [0, 0],
      [1, 1],
      [5, 5],
      [10, 10],
    ] as const
  ).forEach(r => {
    expect(visibleColToGlobalCol(blanks, r[0])).toBe(r[1])
  })
})

test('visibleColToGlobalCol with consecutive blanks', () => {
  const blanks = [2, 3, 4, 7, 8]
  ;(
    [
      [0, 0],
      [1, 1],
      [2, 5], // After position 1, skip 3 blanks (2,3,4)
      [3, 6], // Next position
      [4, 9], // After position 3, skip 2 blanks (7,8)
      [5, 10],
    ] as const
  ).forEach(r => {
    expect(visibleColToGlobalCol(blanks, r[0])).toBe(r[1])
  })
})

test('visibleColToGlobalCol with blanks at the beginning', () => {
  const blanks = [1, 2, 5]
  ;(
    [
      [0, 0],
      [1, 3], // After position 0, skip 2 blanks (1,2)
      [2, 4],
      [3, 6], // After position 2, skip 1 blank (5)
      [4, 7],
    ] as const
  ).forEach(r => {
    expect(visibleColToGlobalCol(blanks, r[0])).toBe(r[1])
  })
})

test('visibleColToGlobalCol with position exceeding blanks array', () => {
  const blanks = [2, 5]
  ;(
    [
      [0, 0],
      [1, 1],
      [2, 3], // After position 1, skip 1 blank (2)
      [3, 4],
      [4, 6], // After position 3, skip 1 blank (5)
      [10, 12], // Far beyond blanks array
    ] as const
  ).forEach(r => {
    expect(visibleColToGlobalCol(blanks, r[0])).toBe(r[1])
  })
})

// Tests for globalColToVisibleCol (global → visible)
test('globalColToVisibleCol with blanks at positions [2, 5, 8]', () => {
  const blanks = [2, 5, 8]
  // Inverse of visibleColToGlobalCol
  expect(globalColToVisibleCol(blanks, 0)).toBe(0)
  expect(globalColToVisibleCol(blanks, 1)).toBe(1)
  expect(globalColToVisibleCol(blanks, 2)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 3)).toBe(2)
  expect(globalColToVisibleCol(blanks, 4)).toBe(3)
  expect(globalColToVisibleCol(blanks, 5)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 6)).toBe(4)
  expect(globalColToVisibleCol(blanks, 7)).toBe(5)
  expect(globalColToVisibleCol(blanks, 8)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 9)).toBe(6)
  expect(globalColToVisibleCol(blanks, 10)).toBe(7)
})

test('globalColToVisibleCol with no blanks', () => {
  const blanks: number[] = []
  expect(globalColToVisibleCol(blanks, 0)).toBe(0)
  expect(globalColToVisibleCol(blanks, 5)).toBe(5)
  expect(globalColToVisibleCol(blanks, 10)).toBe(10)
})

test('globalColToVisibleCol with consecutive blanks', () => {
  const blanks = [2, 3, 4, 7, 8]
  expect(globalColToVisibleCol(blanks, 0)).toBe(0)
  expect(globalColToVisibleCol(blanks, 1)).toBe(1)
  expect(globalColToVisibleCol(blanks, 2)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 3)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 4)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 5)).toBe(2)
  expect(globalColToVisibleCol(blanks, 6)).toBe(3)
  expect(globalColToVisibleCol(blanks, 7)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 8)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 9)).toBe(4)
  expect(globalColToVisibleCol(blanks, 10)).toBe(5)
})

// Tests for globalColToSeqPos (global column → sequence position)
test('globalColToSeqPos with gaps in sequence', () => {
  const sequence = 'AC-GT-A'
  expect(globalColToSeqPos(sequence, 0)).toBe(0)
  expect(globalColToSeqPos(sequence, 1)).toBe(1)
  expect(globalColToSeqPos(sequence, 2)).toBe(2)
  // Position 2 is a gap, so count before it is 2
  expect(globalColToSeqPos(sequence, 3)).toBe(2)
  expect(globalColToSeqPos(sequence, 4)).toBe(3)
  expect(globalColToSeqPos(sequence, 5)).toBe(4)
  // Position 5 is a gap, so count before it is 4
  expect(globalColToSeqPos(sequence, 6)).toBe(4)
})

test('globalColToSeqPos with mixed gap characters (- and .)', () => {
  const sequence = 'AC.GT-A'
  expect(globalColToSeqPos(sequence, 0)).toBe(0)
  expect(globalColToSeqPos(sequence, 1)).toBe(1)
  // Position 2 is a gap (.), so count before it is 2
  expect(globalColToSeqPos(sequence, 2)).toBe(2)
  expect(globalColToSeqPos(sequence, 3)).toBe(2)
  expect(globalColToSeqPos(sequence, 4)).toBe(3)
  // Position 5 is a gap (-), so count before it is 4
  expect(globalColToSeqPos(sequence, 5)).toBe(4)
  expect(globalColToSeqPos(sequence, 6)).toBe(4)
})

test('globalColToSeqPos with no gaps in sequence', () => {
  const sequence = 'ACGTA'
  expect(globalColToSeqPos(sequence, 0)).toBe(0)
  expect(globalColToSeqPos(sequence, 1)).toBe(1)
  expect(globalColToSeqPos(sequence, 2)).toBe(2)
  expect(globalColToSeqPos(sequence, 3)).toBe(3)
  expect(globalColToSeqPos(sequence, 4)).toBe(4)
})

test('globalColToSeqPos with all gaps in sequence', () => {
  const sequence = '-----'
  expect(globalColToSeqPos(sequence, 0)).toBe(0)
  expect(globalColToSeqPos(sequence, 1)).toBe(0)
  expect(globalColToSeqPos(sequence, 2)).toBe(0)
  expect(globalColToSeqPos(sequence, 3)).toBe(0)
  expect(globalColToSeqPos(sequence, 4)).toBe(0)
})

test('globalColToSeqPos with position exceeding sequence length', () => {
  const sequence = 'AC-GT'
  expect(globalColToSeqPos(sequence, 10)).toBe(4)
})

// Tests for visibleColToSeqPos (visible column → sequence position)
test('visibleColToSeqPos returns sequence position or undefined for gaps', () => {
  const seq = 'AC--GT--CT'
  expect(visibleColToSeqPos({ seq, visibleCol: 0, blanks: [] })).toBe(0)
  expect(visibleColToSeqPos({ seq, visibleCol: 1, blanks: [] })).toBe(1)
  expect(visibleColToSeqPos({ seq, visibleCol: 2, blanks: [] })).toBe(undefined)
  expect(visibleColToSeqPos({ seq, visibleCol: 3, blanks: [] })).toBe(undefined)
  expect(visibleColToSeqPos({ seq, visibleCol: 4, blanks: [] })).toBe(2)
  expect(visibleColToSeqPos({ seq, visibleCol: 5, blanks: [] })).toBe(3)
  expect(visibleColToSeqPos({ seq, visibleCol: 6, blanks: [] })).toBe(undefined)
  expect(visibleColToSeqPos({ seq, visibleCol: 7, blanks: [] })).toBe(undefined)
  expect(visibleColToSeqPos({ seq, visibleCol: 8, blanks: [] })).toBe(4)
  expect(visibleColToSeqPos({ seq, visibleCol: 9, blanks: [] })).toBe(5)
})

// Round-trip tests: visible → global → visible should be identity for valid columns
test('round-trip: visibleColToGlobalCol and globalColToVisibleCol are inverses', () => {
  const blanks = [2, 5, 8]
  // For each visible column, going to global and back should return the same value
  for (let visibleCol = 0; visibleCol < 10; visibleCol++) {
    const globalCol = visibleColToGlobalCol(blanks, visibleCol)
    const backToVisible = globalColToVisibleCol(blanks, globalCol)
    expect(backToVisible).toBe(visibleCol)
  }
})

test('round-trip: globalColToVisibleCol and visibleColToGlobalCol for non-hidden columns', () => {
  const blanks = [2, 5, 8]
  // For each global column that is NOT hidden, going to visible and back should return the same value
  for (let globalCol = 0; globalCol < 15; globalCol++) {
    const visibleCol = globalColToVisibleCol(blanks, globalCol)
    if (visibleCol !== undefined) {
      const backToGlobal = visibleColToGlobalCol(blanks, visibleCol)
      expect(backToGlobal).toBe(globalCol)
    }
  }
})

// Edge case: blanks at position 0
test('globalColToVisibleCol with blank at position 0', () => {
  const blanks = [0, 1, 5]
  expect(globalColToVisibleCol(blanks, 0)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 1)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 2)).toBe(0) // First visible column
  expect(globalColToVisibleCol(blanks, 3)).toBe(1)
  expect(globalColToVisibleCol(blanks, 4)).toBe(2)
  expect(globalColToVisibleCol(blanks, 5)).toBe(undefined) // Hidden
  expect(globalColToVisibleCol(blanks, 6)).toBe(3)
})

test('visibleColToGlobalCol with blank at position 0', () => {
  const blanks = [0, 1, 5]
  expect(visibleColToGlobalCol(blanks, 0)).toBe(2) // Skips 0, 1
  expect(visibleColToGlobalCol(blanks, 1)).toBe(3)
  expect(visibleColToGlobalCol(blanks, 2)).toBe(4)
  expect(visibleColToGlobalCol(blanks, 3)).toBe(6) // Skips 5
})

// Edge case: all columns before a position are blanks
test('globalColToVisibleCol with many leading blanks', () => {
  const blanks = [0, 1, 2, 3, 4]
  expect(globalColToVisibleCol(blanks, 0)).toBe(undefined)
  expect(globalColToVisibleCol(blanks, 4)).toBe(undefined)
  expect(globalColToVisibleCol(blanks, 5)).toBe(0) // First visible
  expect(globalColToVisibleCol(blanks, 6)).toBe(1)
  expect(globalColToVisibleCol(blanks, 10)).toBe(5)
})

// Test visibleColToSeqPos with blanks (combined gap hiding and row gaps)
test('visibleColToSeqPos with both blanks and row gaps', () => {
  // Sequence: A-C-G (global cols 0,1,2,3,4)
  // If blanks = [1, 3], visible sequence becomes: A C G (visible cols 0,1,2)
  const seq = 'A-C-G'
  const blanks = [1, 3]

  // Visible col 0 → global col 0 → 'A' → seqPos 0
  expect(visibleColToSeqPos({ seq, visibleCol: 0, blanks })).toBe(0)

  // Visible col 1 → global col 2 → 'C' → seqPos 1
  expect(visibleColToSeqPos({ seq, visibleCol: 1, blanks })).toBe(1)

  // Visible col 2 → global col 4 → 'G' → seqPos 2
  expect(visibleColToSeqPos({ seq, visibleCol: 2, blanks })).toBe(2)
})

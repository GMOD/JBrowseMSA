import { expect, test } from 'vitest'

import {
  globalCoordToRowSpecificCoord,
  mouseOverCoordToGapRemovedCoord,
  mouseOverCoordToGlobalCoord,
} from './rowCoordinateCalculations'

test('with blanks at positions [2, 5, 8]', () => {
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
    expect(mouseOverCoordToGlobalCoord(blanks, r[0])).toBe(r[1])
  })
})

test('with no blanks', () => {
  const blanks: number[] = []
  ;(
    [
      [0, 0],
      [1, 1],
      [5, 5],
      [10, 10],
    ] as const
  ).forEach(r => {
    expect(mouseOverCoordToGlobalCoord(blanks, r[0])).toBe(r[1])
  })
})

test('with consecutive blanks', () => {
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
    expect(mouseOverCoordToGlobalCoord(blanks, r[0])).toBe(r[1])
  })
})

test('with blanks at the beginning', () => {
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
    expect(mouseOverCoordToGlobalCoord(blanks, r[0])).toBe(r[1])
  })
})

test('with position exceeding blanks array', () => {
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
    expect(mouseOverCoordToGlobalCoord(blanks, r[0])).toBe(r[1])
  })
})

test('with gaps in sequence', () => {
  const sequence = 'AC-GT-A'
  expect(globalCoordToRowSpecificCoord(sequence, 0)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 1)).toBe(1)
  expect(globalCoordToRowSpecificCoord(sequence, 2)).toBe(2)
  // Position 2 is a gap, so count before it is 2
  expect(globalCoordToRowSpecificCoord(sequence, 3)).toBe(2)
  expect(globalCoordToRowSpecificCoord(sequence, 4)).toBe(3)
  expect(globalCoordToRowSpecificCoord(sequence, 5)).toBe(4)
  // Position 5 is a gap, so count before it is 4
  expect(globalCoordToRowSpecificCoord(sequence, 6)).toBe(4)
})

test('with mixed gap characters (- and .)', () => {
  const sequence = 'AC.GT-A'
  expect(globalCoordToRowSpecificCoord(sequence, 0)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 1)).toBe(1)
  // Position 2 is a gap (.), so count before it is 2
  expect(globalCoordToRowSpecificCoord(sequence, 2)).toBe(2)
  expect(globalCoordToRowSpecificCoord(sequence, 3)).toBe(2)
  expect(globalCoordToRowSpecificCoord(sequence, 4)).toBe(3)
  // Position 5 is a gap (-), so count before it is 4
  expect(globalCoordToRowSpecificCoord(sequence, 5)).toBe(4)
  expect(globalCoordToRowSpecificCoord(sequence, 6)).toBe(4)
})

test('with no gaps in sequence', () => {
  const sequence = 'ACGTA'
  expect(globalCoordToRowSpecificCoord(sequence, 0)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 1)).toBe(1)
  expect(globalCoordToRowSpecificCoord(sequence, 2)).toBe(2)
  expect(globalCoordToRowSpecificCoord(sequence, 3)).toBe(3)
  expect(globalCoordToRowSpecificCoord(sequence, 4)).toBe(4)
})

test('with all gaps in sequence', () => {
  const sequence = '-----'
  expect(globalCoordToRowSpecificCoord(sequence, 0)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 1)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 2)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 3)).toBe(0)
  expect(globalCoordToRowSpecificCoord(sequence, 4)).toBe(0)
})

test('with position exceeding sequence length', () => {
  const sequence = 'AC-GT'
  expect(globalCoordToRowSpecificCoord(sequence, 10)).toBe(4)
})

test('mouseOverCoordToGapRemovedCoord', () => {
  const seq = 'AC--GT--CT'
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 0, blanks: [] }),
  ).toBe(0)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 1, blanks: [] }),
  ).toBe(1)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 2, blanks: [] }),
  ).toBe(undefined)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 3, blanks: [] }),
  ).toBe(undefined)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 4, blanks: [] }),
  ).toBe(2)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 5, blanks: [] }),
  ).toBe(3)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 6, blanks: [] }),
  ).toBe(undefined)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 7, blanks: [] }),
  ).toBe(undefined)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 8, blanks: [] }),
  ).toBe(4)
  expect(
    mouseOverCoordToGapRemovedCoord({ seq, position: 9, blanks: [] }),
  ).toBe(5)
})

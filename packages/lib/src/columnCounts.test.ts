import { describe, expect, test } from 'vitest'

import {
  columnCountsFromColumns,
  columnCountsFromRows,
  letterOfResidueSlot,
} from './columnCounts.ts'

describe('columnCounts', () => {
  test('tallies residues and gaps per column', () => {
    const counts = columnCountsFromRows(['AC-', 'AG.', 'AC-'])
    expect(counts.numColumns).toBe(3)
    expect(counts.count(0, 'A')).toBe(3)
    expect(counts.count(1, 'C')).toBe(2)
    expect(counts.count(1, 'G')).toBe(1)
    expect(counts.total(2)).toBe(3)
    expect(counts.gapCount(2)).toBe(3)
    expect(counts.gapCount(0)).toBe(0)
  })

  test('counts both gap characters, and neither as a residue', () => {
    const counts = columnCountsFromColumns(['-.A'])
    expect(counts.count(0, '-')).toBe(1)
    expect(counts.count(0, '.')).toBe(1)
    expect(counts.gapCount(0)).toBe(2)
    expect(counts.residueEntries(0)).toEqual([['A', 1]])
    expect(counts.lettersPresent).toEqual(new Set(['A']))
  })

  test('folds case, so lowercase (a3m insertions) counts as its residue', () => {
    const counts = columnCountsFromColumns(['aA'])
    expect(counts.count(0, 'A')).toBe(2)
  })

  test('digits and punctuation do not land on letter slots', () => {
    // a plain `code & 31` would fold '0' onto 'P' and '!' onto 'A'
    const counts = columnCountsFromColumns(['0!'])
    expect(counts.count(0, 'P')).toBe(0)
    expect(counts.count(0, 'A')).toBe(0)
    expect(counts.residueEntries(0)).toEqual([['?', 2]])
  })

  test('ragged rows: the widest row sets the column count', () => {
    const counts = columnCountsFromRows(['AAAA', 'AA'])
    expect(counts.numColumns).toBe(4)
    expect(counts.total(0)).toBe(2)
    expect(counts.total(3)).toBe(1)
  })

  test('residue slots round-trip to their letters', () => {
    const counts = columnCountsFromColumns(['WY'])
    const slots: number[] = []
    counts.forEachResidue(0, slot => {
      slots.push(slot)
    })
    expect(slots.map(letterOfResidueSlot)).toEqual(['W', 'Y'])
  })
})

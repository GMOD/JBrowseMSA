import { expect, test } from 'vitest'

import { columnCountsFromColumns } from './columnCounts.ts'
import { columnLogoStack, maxBitsFor } from './sequenceLogo.ts'

const dnaBits = maxBitsFor('dna')
const aminoBits = maxBitsFor('amino')

function stackOf(column: string, maxBits = dnaBits) {
  return columnLogoStack(columnCountsFromColumns([column]), 0, maxBits)
}

test('maxBits is log2 of the alphabet', () => {
  expect(maxBitsFor('dna')).toBe(2)
  expect(maxBitsFor('rna')).toBe(2)
  expect(maxBitsFor('amino')).toBeCloseTo(4.3219, 4)
})

test('a fully conserved column is one letter at the full height', () => {
  const stack = stackOf('AAAA')
  expect(stack).toHaveLength(1)
  expect(stack[0]!.letter).toBe('A')
  expect(stack[0]!.bits).toBeCloseTo(2, 10)
})

test('an even four-way column carries no information', () => {
  expect(stackOf('ACGT')).toEqual([])
})

test('a two-way split is half the height, shared evenly', () => {
  const stack = stackOf('AACC')
  expect(stack.map(s => s.letter)).toEqual(['A', 'C'])
  // entropy 1 bit, so information content is 2 - 1 = 1, split evenly
  expect(stack[0]!.bits).toBeCloseTo(0.5, 10)
  expect(stack[1]!.bits).toBeCloseTo(0.5, 10)
})

test('letters are ordered ascending so the tallest draws last, on top', () => {
  const stack = stackOf('AAAC')
  expect(stack.map(s => s.letter)).toEqual(['C', 'A'])
  expect(stack[0]!.bits).toBeLessThan(stack[1]!.bits)
})

test('ties break on letter so redraws are stable', () => {
  expect(stackOf('GGCC').map(s => s.letter)).toEqual(['C', 'G'])
  expect(stackOf('CCGG').map(s => s.letter)).toEqual(['C', 'G'])
})

test('gaps scale the stack down without skewing the frequencies', () => {
  // 'A' is the only residue, so it takes the whole stack either way; the height
  // is what the gaps change
  const clean = stackOf('AAAA')
  const gappy = stackOf('AA--')
  expect(gappy[0]!.letter).toBe('A')
  expect(gappy[0]!.bits).toBeCloseTo(clean[0]!.bits / 2, 10)
})

test('gaps do not make a two-residue column look like a four-way one', () => {
  // frequencies come from the two real residues, so this is a 1-bit choice
  // scaled by the half-gap occupancy, not a 4-way split
  const stack = stackOf('AC--')
  expect(stack.map(s => s.letter)).toEqual(['A', 'C'])
  expect(stack[0]!.bits + stack[1]!.bits).toBeCloseTo(0.5, 10)
})

test('an all-gap column has no stack', () => {
  expect(stackOf('----')).toEqual([])
  expect(stackOf('....')).toEqual([])
})

test('the protein ceiling is higher than the nucleotide one', () => {
  const protein = stackOf('WWWW', aminoBits)
  expect(protein[0]!.bits).toBeCloseTo(aminoBits, 10)
  expect(protein[0]!.bits).toBeGreaterThan(stackOf('AAAA')[0]!.bits)
})

test('stack height never exceeds the ceiling', () => {
  const columns = ['AAAA', 'AACG', 'A-C-', 'ACGT', 'AAAT']
  for (const column of columns) {
    const total = stackOf(column).reduce((a, b) => a + b.bits, 0)
    expect(total).toBeLessThanOrEqual(dnaBits + 1e-9)
  }
})

test('a column past the end of a ragged alignment is empty, not a crash', () => {
  const counts = columnCountsFromColumns(['AC'])
  expect(columnLogoStack(counts, 5, dnaBits)).toEqual([])
})

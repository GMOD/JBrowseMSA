import { describe, expect, test } from 'vitest'

import { columnCountsFromColumns } from './columnCounts.ts'
import { tileColorFn } from './components/msa/tileColor.ts'
import MSAModelF from './model.ts'
import {
  blosum62ColumnColors,
  identityColumnColors,
} from './similarityColors.ts'

// one alignment column, given top-to-bottom
function blosum(letters: string) {
  return blosum62ColumnColors(columnCountsFromColumns([letters]), 0)
}

function identity(letters: string) {
  return identityColumnColors(columnCountsFromColumns([letters]), 0)
}

const lightness = (color: string | undefined) =>
  Number(/(\d+)%\)$/.exec(color ?? '')?.[1])

describe('blosum62ColumnColors', () => {
  test('a conserved column takes the darkest shade', () => {
    expect(blosum('LLLL')).toEqual({ L: 'hsl(240, 50%, 40%)' })
  })

  test('a conservative substitution shades darker than a radical one', () => {
    const conservative = blosum('LLLI')
    const radical = blosum('LLLD')
    expect(lightness(conservative.L)).toBeLessThan(lightness(radical.L))
    expect(lightness(conservative.I)).toBeLessThan(lightness(radical.D))
  })

  test('a residue unlike every other in its column takes the lightest shade', () => {
    expect(blosum('LD').L).toBe('hsl(240, 50%, 96%)')
  })

  test('gaps leave the shade as it is', () => {
    expect(blosum('LLI---')).toEqual(blosum('LLI'))
  })

  test('a column with under two residues colors nothing', () => {
    expect(blosum('L')).toEqual({})
    expect(blosum('L---')).toEqual({})
    expect(blosum('----')).toEqual({})
  })

  test('letters the matrix does not name neither shade nor count', () => {
    expect(blosum('LLU')).toEqual(blosum('LL'))
  })
})

describe('identityColumnColors', () => {
  test('shades by the fraction of the rest of the column that matches', () => {
    expect(identity('AAAA')).toEqual({ A: 'hsl(240, 50%, 40%)' })
    expect(identity('AC').A).toBe('hsl(240, 50%, 96%)')
    expect(lightness(identity('AAAC').A)).toBeLessThan(
      lightness(identity('AACC').A),
    )
  })
})

describe('blosum62_dynamic', () => {
  function makeModel(msa: string) {
    return MSAModelF().create({
      type: 'MsaView',
      residueColor: { scale: { scheme: 'blosum62_dynamic' } },
      data: { msa },
    })
  }

  test('colors an amino acid alignment by BLOSUM62', () => {
    const model = makeModel('>a\nMKAL\n>b\nMRAI\n>c\nMKAL\n')
    expect(model.dynamicColorSchemeName).toBe('blosum62_dynamic')
    const color = tileColorFn(model)
    // K and R are a positive-scoring pair, so K is shaded in a mixed column
    expect(lightness(color(1, 'K'))).toBeLessThan(96)
    expect(lightness(color(0, 'M'))).toBe(40)
  })

  test('falls back to identity on a nucleotide alignment', () => {
    const model = makeModel('>a\nACGT\n>b\nACGA\n>c\nACGT\n')
    expect(model.sequenceType).toBe('dna')
    const color = tileColorFn(model)
    expect(color(0, 'A')).toBe(identity('AAA').A)
    expect(color(3, 'T')).toBe(identity('TAT').T)
    expect(color(3, 'A')).toBe(identity('TAT').A)
  })
})

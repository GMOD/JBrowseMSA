import { describe, expect, test } from 'vitest'

import { clustalXColumnColors } from './clustalX.ts'
import { columnCountsFromColumns } from './columnCounts.ts'

// one alignment column, given top-to-bottom
function column(letters: string) {
  return clustalXColumnColors(columnCountsFromColumns([letters]), 0)
}

const BLUE = 'rgb(128,179,230)'
const RED = '#d88'
const GREEN = '#8f8'
const GREEN_ST = 'rgb(26,204,26)'
const ORANGE = 'rgb(240, 144, 72)'
const YELLOW = 'rgb(204, 204, 0)'
const CYAN = 'rgb(26, 179, 179)'

describe('clustalXColumnColors', () => {
  test('hydrophobic column (all L) colors the hydrophobic group', () => {
    expect(column('LLLLLLLLLL')).toEqual({
      W: BLUE,
      L: BLUE,
      V: BLUE,
      A: BLUE,
      I: BLUE,
      M: BLUE,
      F: BLUE,
      C: BLUE,
      S: GREEN_ST,
      T: GREEN_ST,
      H: CYAN,
      Y: CYAN,
    })
  })

  test('glycine is always colored when present', () => {
    expect(column('GGGGGGGGGG')).toEqual({
      G: ORANGE,
    })
  })

  test('proline is always colored, and counts as hydrophobic', () => {
    expect(column('PPPPPPPPPP')).toEqual({
      W: BLUE,
      L: BLUE,
      V: BLUE,
      A: BLUE,
      I: BLUE,
      M: BLUE,
      F: BLUE,
      C: BLUE,
      S: GREEN_ST,
      T: GREEN_ST,
      P: YELLOW,
      H: CYAN,
      Y: CYAN,
    })
  })

  test('positively charged column (all K)', () => {
    expect(column('KKKKKKKKKK')).toEqual({
      K: RED,
      R: RED,
      E: 'rgb(192, 72, 192)',
      D: 'rgb(204, 77, 204)',
      Q: GREEN,
    })
  })

  test('unconserved column produces no colors', () => {
    expect(column('XXXXXXXXXX')).toEqual({})
  })
})

import { describe, expect, test } from 'vitest'

import { clustalXColumnColors } from './clustalX.ts'

function counts(letters: string) {
  const stats: Record<string, number> = {}
  for (const c of letters) {
    stats[c] = (stats[c] ?? 0) + 1
  }
  return stats
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
    expect(clustalXColumnColors(counts('LLLLLLLLLL'), 10)).toEqual({
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
    expect(clustalXColumnColors(counts('GGGGGGGGGG'), 10)).toEqual({
      G: ORANGE,
    })
  })

  test('proline is always colored, and counts as hydrophobic', () => {
    expect(clustalXColumnColors(counts('PPPPPPPPPP'), 10)).toEqual({
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
    expect(clustalXColumnColors(counts('KKKKKKKKKK'), 10)).toEqual({
      K: RED,
      R: RED,
      E: 'rgb(192, 72, 192)',
      D: 'rgb(204, 77, 204)',
      Q: GREEN,
    })
  })

  test('unconserved column produces no colors', () => {
    expect(clustalXColumnColors(counts('XXXXXXXXXX'), 10)).toEqual({})
  })
})

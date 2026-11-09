import { expect, test } from 'vitest'

import { ellipsize } from './ellipsize.ts'

const measure = (text: string) => text.length * 10

test('a label that fits is drawn whole', () => {
  expect(ellipsize(measure, 'abcdef', 60)).toEqual({
    text: 'abcdef',
    width: 60,
  })
})

test('a label that overflows keeps both ends around the ellipsis', () => {
  expect(ellipsize(measure, 'abcdefghij', 45)).toEqual({
    text: 'ab…j',
    width: 40,
  })
})

test('a UniProt name keeps its accession prefix and species suffix', () => {
  expect(ellipsize(measure, 'UniProt|P01589|IL2RA_HUMAN', 150).text).toBe(
    'UniProt…A_HUMAN',
  )
})

test('the cut drops spaces next to the ellipsis', () => {
  expect(ellipsize(measure, 'ab cdefg hi', 60).text).toBe('ab…hi')
})

test('a label with no room draws nothing', () => {
  expect(ellipsize(measure, 'abcdef', 5)).toEqual({ text: '', width: 0 })
})

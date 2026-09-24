import { expect, test } from 'vitest'

import { parseRowRange, toFragment } from './rowRange.ts'

test('reads the /start-end suffix off a row name', () => {
  expect(parseRowRange('P12931/84-145')).toEqual({ start: 84, end: 145 })
  expect(parseRowRange('SRC_HUMAN/1-536')).toEqual({ start: 1, end: 536 })
})

test('a name without a well-formed suffix is not a fragment', () => {
  expect(parseRowRange('SARS-CoV-2')).toBeUndefined()
  expect(parseRowRange('P12931')).toBeUndefined()
  expect(parseRowRange('P12931/145-84')).toBeUndefined()
  expect(parseRowRange('P12931/0-5')).toBeUndefined()
})

test('a span moves into fragment positions and clips to it', () => {
  const range = { start: 27, end: 137 }
  expect(toFragment({ start: 30, end: 100 }, range)).toEqual({
    start: 4,
    end: 74,
  })
  expect(toFragment({ start: 10, end: 200 }, range)).toEqual({
    start: 1,
    end: 111,
  })
  expect(toFragment({ start: 140, end: 200 }, range)).toBeUndefined()
})

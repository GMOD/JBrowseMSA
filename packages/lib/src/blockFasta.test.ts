import { expect, test } from 'vitest'

import { blockFasta } from './blockFasta.ts'

test('a block keeps its gaps and names each row', () => {
  const rows = [
    ['human', 'MKAANSE'],
    ['mouse', 'MKA-NSE'],
  ] as const
  expect(blockFasta(rows, 3, 5)).toBe('>human\nAAN\n>mouse\nA-N\n')
})

test('a row ending inside the block pads to its width', () => {
  expect(blockFasta([['short', 'MKA']], 2, 5)).toBe('>short\nKA--\n')
})

test('no rows is an empty string', () => {
  expect(blockFasta([], 1, 3)).toBe('')
})

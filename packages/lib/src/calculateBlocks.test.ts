import { expect, test } from 'vitest'

import { calculateBlocks } from './calculateBlocks.ts'

const blockSize = 100

test('the blocks cover the viewport and stop at the content edge', () => {
  expect(
    calculateBlocks({
      mapSize: 1000,
      blockSize,
      viewportPos: 150,
      viewportSize: 300,
    }),
  ).toEqual([100, 200, 300, 400])
  expect(
    calculateBlocks({
      mapSize: 250,
      blockSize,
      viewportPos: 0,
      viewportSize: 900,
    }),
  ).toEqual([0, 100, 200])
  expect(
    calculateBlocks({
      mapSize: 200,
      blockSize,
      viewportPos: 0,
      viewportSize: 900,
    }),
  ).toEqual([0, 100])
})

test('an over-scroll past the end still fills the viewport', () => {
  expect(
    calculateBlocks({
      mapSize: 1000,
      blockSize,
      viewportPos: 950,
      viewportSize: 300,
    }),
  ).toEqual([700, 800, 900])
})

test('no content mounts no blocks', () => {
  expect(
    calculateBlocks({
      mapSize: 0,
      blockSize,
      viewportPos: 0,
      viewportSize: 900,
    }),
  ).toEqual([])
})

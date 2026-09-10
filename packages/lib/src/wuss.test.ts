import { expect, test } from 'vitest'

import { parseWuss } from './wuss.ts'

test('nested helix', () => {
  expect(parseWuss('<<<___>>>')).toEqual([
    { start: 0, end: 8, pseudoknot: false },
    { start: 1, end: 7, pseudoknot: false },
    { start: 2, end: 6, pseudoknot: false },
  ])
})

test('bracket types keep separate stacks', () => {
  // an Rfam seed mixes types within one structure; a `)` must not close a `<`
  expect(parseWuss('(<)>')).toEqual([
    { start: 0, end: 2, pseudoknot: false },
    { start: 1, end: 3, pseudoknot: false },
  ])
})

test('letter pairs are pseudoknots', () => {
  // the RF00507 shape: a helix with a knot crossing out of it
  expect(parseWuss('<<AA>>aa')).toEqual([
    { start: 0, end: 5, pseudoknot: false },
    { start: 1, end: 4, pseudoknot: false },
    { start: 2, end: 7, pseudoknot: true },
    { start: 3, end: 6, pseudoknot: true },
  ])
})

test('unmatched brackets are dropped', () => {
  expect(parseWuss('<<>')).toEqual([{ start: 1, end: 2, pseudoknot: false }])
  expect(parseWuss('>>')).toEqual([])
})

test('unpaired characters pair nothing', () => {
  expect(parseWuss('.,_-:~')).toEqual([])
})

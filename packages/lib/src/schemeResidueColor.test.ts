import { expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { schemeResidueColor } from './schemeResidueColor.ts'

// column 2 is a gap in every row, so hiding gaps drops it
const msa = '>a\nMK-AL\n>b\nMR-AI\n>c\nMK-AL\n'

function makeModel(snapshot: Record<string, unknown> = {}) {
  return MSAModelF().create({ type: 'MsaView', data: { msa }, ...snapshot })
}

test('a static scheme gives each residue its letter color as hex', () => {
  const color = schemeResidueColor(
    makeModel({ residueColor: { scale: { scheme: 'clustal' } } }),
  )
  expect(color('a', 1)).toBe('#008000')
  expect(color('a', 2)).toBe('#ff0000')
})

test('a residue the scheme leaves out has no color', () => {
  const color = schemeResidueColor(
    makeModel({ residueColor: { scale: { scheme: 'clustal' } } }),
  )
  expect(color('a', 3)).toBeUndefined()
})

test('a dynamic scheme gives the color of the residue in its column, as hex', () => {
  const color = schemeResidueColor(
    makeModel({ residueColor: { scale: { scheme: 'blosum62_dynamic' } } }),
  )
  expect(color('a', 1)).toMatch(/^#[0-9a-f]{6}$/)
  expect(color('a', 1)).toBe(color('b', 1))
  expect(color('a', 2)).not.toBe(color('b', 2))
})

test('a position past the row, or a row the alignment lacks, has no color', () => {
  const color = schemeResidueColor(
    makeModel({ residueColor: { scale: { scheme: 'clustal' } } }),
  )
  expect(color('a', 99)).toBeUndefined()
  expect(color('nope', 1)).toBeUndefined()
})

test('hiding gaps keeps each residue on its own column', () => {
  const model = makeModel({
    residueColor: { scale: { scheme: 'blosum62_dynamic' } },
  })
  const shown = schemeResidueColor(model)
  const before = [1, 2, 3, 4].map(pos => shown('a', pos))
  model.setHideGaps(true)
  const hidden = schemeResidueColor(model)
  expect([1, 2, 3, 4].map(pos => hidden('a', pos))).toEqual(before)
})

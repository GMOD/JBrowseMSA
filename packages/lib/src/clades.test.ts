// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { Clade } from './types.ts'

const msa = `>A
MKAA
>B
MKAA
>C
MRAA
>D
MRAA`

const tree = '((A,B),(C,D));'

const defaultFill = 'rgba(255, 243, 196, 0.6)'

function makeModel(clades: Clade[], treeText = tree) {
  const model = MSAModelF().create({
    id: 'clades-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree: treeText },
    clades,
  })
  model.setWidth(800)
  return model
}

test('an MRCA and its tip count resolve to the rows the clade covers', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'highlight' }])
  expect(model.rowNames).toEqual(['A', 'B', 'C', 'D'])
  expect(model.resolvedClades).toEqual([
    { rows: [0, 1], mark: 'highlight', color: defaultFill },
  ])
})

test('two tips address a clade of any size', () => {
  const model = makeModel([{ mrca: ['A', 'D'], tips: 4, mark: 'highlight' }])
  expect(model.resolvedClades[0]!.rows).toEqual([0, 3])
})

test('a tip count the tree disagrees with drops the clade', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 3, mark: 'highlight' }])
  expect(model.resolvedClades).toEqual([])
})

test('an unknown tip name drops the clade', () => {
  const model = makeModel([{ mrca: ['A', 'nope'], tips: 2, mark: 'highlight' }])
  expect(model.resolvedClades).toEqual([])
})

test('a tip name two rows share drops the clade', () => {
  const model = makeModel(
    [{ mrca: ['A', 'C'], tips: 2, mark: 'highlight' }],
    '((A,B),(A,D));',
  )
  expect(model.resolvedClades).toEqual([])
})

test('a range covers the run between its ends, given in either order', () => {
  const forward = makeModel([{ range: ['B', 'D'], tips: 3, mark: 'highlight' }])
  const backward = makeModel([
    { range: ['D', 'B'], tips: 3, mark: 'highlight' },
  ])
  expect(forward.resolvedClades[0]!.rows).toEqual([1, 3])
  expect(backward.resolvedClades[0]!.rows).toEqual([1, 3])
})

test("a range's tip count is checked against the length of the run", () => {
  const model = makeModel([{ range: ['B', 'D'], tips: 2, mark: 'highlight' }])
  expect(model.resolvedClades).toEqual([])
})

test('a color with no alpha of its own draws translucent', () => {
  const model = makeModel([
    { mrca: ['A', 'B'], tips: 2, mark: 'highlight', color: '#e41a1c' },
    { mrca: ['C', 'D'], tips: 2, mark: 'highlight', color: 'rgba(0,0,0,0.9)' },
  ])
  expect(model.resolvedClades.map(c => c.color)).toEqual([
    'rgba(228, 26, 28, 0.6)',
    'rgba(0,0,0,0.9)',
  ])
})

test('a collapsed neighbour moves the rows and keeps the clade', () => {
  const model = makeModel([{ mrca: ['C', 'D'], tips: 2, mark: 'highlight' }])
  model.toggleCollapsed(model.root.children![0]!.data.id)
  expect(model.rowNames.slice(1)).toEqual(['C', 'D'])
  expect(model.resolvedClades[0]!.rows).toEqual([1, 2])
})

test('setClades replaces the layer', () => {
  const model = makeModel([])
  expect(model.resolvedClades).toEqual([])
  model.setClades([{ mrca: ['C', 'D'], tips: 2, mark: 'highlight' }])
  expect(model.resolvedClades[0]!.rows).toEqual([2, 3])
})

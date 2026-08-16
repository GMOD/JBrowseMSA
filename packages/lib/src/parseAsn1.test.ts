import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

import { flatToTree } from './flatToTree.ts'
import MSAModelF from './model.ts'
import { parseAsn1 } from './parseAsn1.ts'

const r = readFileSync(
  new URL('../test/data/tree.asn', import.meta.url),
  'utf8',
)

test('real data file', () => {
  expect(parseAsn1(r)).toMatchSnapshot()
})

test('throws a clear error on input missing required sections', () => {
  expect(() => parseAsn1('BioTreeContainer ::= { something {} }')).toThrow(
    /missing/,
  )
})

test('the tree keeps the labels and branch lengths the file carries', () => {
  // the parsed features have to survive into the tree the viewer draws, or a
  // BLAST tree renders as a lengthless list of node ids
  const model = MSAModelF().create({ type: 'MsaView', data: { tree: r } })
  model.setWidth(1000)

  expect(model.numRows).toBe(101)
  expect(model.rowNames[0]).toBe(
    'sodium/glucose cotransporter 4 [Gouania willdenowi]',
  )
  expect(model.allBranchesLength0).toBe(false)
  expect(flatToTree(parseAsn1(r)).length).toBeUndefined()
})

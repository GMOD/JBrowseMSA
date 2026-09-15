// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'.repeat(10)
const msa = `>a\n${row}\n>b\n${row}\n`

function makeModel() {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    colWidth: 10,
    treeAreaWidth: 100,
  })
  model.setWidth(100 + model.resizeHandleWidth + 500)
  return model
}

test('the viewport covers the columns on screen, 1-based', () => {
  const model = makeModel()
  expect(model.viewport).toEqual({ startColumn: 1, endColumn: 50 })
  model.setScrollX(-105)
  expect(model.viewport).toEqual({ startColumn: 11, endColumn: 61 })
})

test('the viewport stops at the last column', () => {
  const model = makeModel()
  model.setColWidth(2)
  expect(model.viewport).toEqual({ startColumn: 1, endColumn: 200 })
})

test('a model with no alignment or no width yet has no viewport', () => {
  expect(MSAModelF().create({ type: 'MsaView' }).viewport).toBeUndefined()
  const unmeasured = MSAModelF().create({ type: 'MsaView', data: { msa } })
  expect(unmeasured.viewport).toBeUndefined()
})

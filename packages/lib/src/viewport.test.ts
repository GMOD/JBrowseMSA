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

test('zoomToRegion fits a column span to the width', () => {
  const model = makeModel()
  model.zoomToRegion({ start: 21, end: 30 })
  expect(model.colWidth).toBe(50)
  expect(model.viewport).toEqual({ startColumn: 21, endColumn: 30 })
})

test('zoomToRegion projects a residue span through the row', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: `>a\n--${row}\n>b\n${row}--\n` },
    treeAreaWidth: 100,
  })
  model.setWidth(100 + model.resizeHandleWidth + 500)
  model.zoomToRegion({ row: 'a', start: 1, end: 10 })
  expect(model.viewport).toEqual({ startColumn: 3, endColumn: 12 })
})

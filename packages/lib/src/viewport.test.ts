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

test('an alignment that fits the width does not scroll', () => {
  const model = makeModel()
  model.setColWidth(2)
  model.setScrollX(-300)
  expect(model.maxScrollX).toBe(0)
  expect(model.scrollX).toBe(0)
})

test('the last column stops at the right edge of the canvas', () => {
  const model = makeModel()
  model.setScrollX(-10_000)
  expect(model.scrollX).toBe(model.msaCanvasWidth - model.totalWidth)
  expect(model.viewport?.endColumn).toBe(200)
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

test('zoomToRegion widens a fractional span to whole columns', () => {
  const model = makeModel()
  model.zoomToRegion({ start: 20.4, end: 29.6 })
  expect(model.viewport).toEqual({ startColumn: 20, endColumn: 30 })
})

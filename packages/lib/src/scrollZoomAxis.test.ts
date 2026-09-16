// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

const msa = `>a
ACGTACGTAC
>b
ACGTACGTAC`

function makeModel() {
  const model = MSAModelF().create({
    id: 'scroll-zoom-axis-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
  })
  model.setWidth(800)
  return model
}

test('the default zoom scales both cell dimensions', () => {
  const model = makeModel()
  const { colWidth, rowHeight } = model
  model.zoomToPos(2, 100, 100)
  expect(model.colWidth).toBe(colWidth * 2)
  expect(model.rowHeight).toBe(rowHeight * 2)
})

test('a horizontal zoom holds the row height', () => {
  const model = makeModel()
  const { colWidth, rowHeight } = model
  model.zoomToPos(2, 100, 100, 'horizontal')
  expect(model.colWidth).toBe(colWidth * 2)
  expect(model.rowHeight).toBe(rowHeight)
})

test('a vertical zoom holds the column width', () => {
  const model = makeModel()
  const { colWidth, rowHeight } = model
  model.zoomToPos(2, 100, 100, 'vertical')
  expect(model.colWidth).toBe(colWidth)
  expect(model.rowHeight).toBe(rowHeight * 2)
})

// the toolbar shows no axis while scroll-zoom is off, so ctrl+wheel takes both
test('the wheel takes both axes while scroll-zoom is off', () => {
  const model = makeModel()
  model.setScrollZoomAxis('horizontal')
  expect(model.wheelZoomAxis).toBe('both')
  model.setScrollZoom(true)
  expect(model.wheelZoomAxis).toBe('horizontal')
})

test('the axis survives toggling scroll-zoom off and back on', () => {
  const model = makeModel()
  model.setScrollZoom(true)
  model.setScrollZoomAxis('vertical')
  model.setScrollZoom(false)
  model.setScrollZoom(true)
  expect(model.wheelZoomAxis).toBe('vertical')
})

test('the default axis stays out of the snapshot', () => {
  const model = makeModel()
  expect(getSnapshot(model).scrollZoomAxis).toBeUndefined()
  model.setScrollZoomAxis('horizontal')
  expect(getSnapshot(model).scrollZoomAxis).toBe('horizontal')
})

import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { defaultColWidth, defaultRowHeight } from './constants.ts'
import MSAModelF from './model.ts'

const msa = '>a\nACGT\n>b\nACGA\n'

const Hosted = MSAModelF({
  defaults: { colWidth: 5, rowHeight: 12, labelsAlignRight: true },
})

test('a host default is the value and stays out of the snapshot', () => {
  const model = Hosted.create({ type: 'MsaView', data: { msa } })
  expect(model.colWidth).toBe(5)
  expect(model.rowHeight).toBe(12)
  expect(model.labelsAlignRight).toBe(true)
  const snap = getSnapshot(model)
  expect(snap.colWidth).toBeUndefined()
  expect(snap.rowHeight).toBeUndefined()
  expect(snap.labelsAlignRight).toBeUndefined()
})

test("the library's own default is a choice under a host's, and travels", () => {
  const model = Hosted.create({ type: 'MsaView', data: { msa } })
  model.setColWidth(defaultColWidth)
  model.setRowHeight(defaultRowHeight)
  model.setLabelsAlignRight(false)
  const snap = getSnapshot(model)
  expect(snap).toMatchObject({
    colWidth: defaultColWidth,
    rowHeight: defaultRowHeight,
    labelsAlignRight: false,
  })

  const reopened = Hosted.create(snap)
  expect(reopened.colWidth).toBe(defaultColWidth)
  expect(reopened.rowHeight).toBe(defaultRowHeight)
  expect(reopened.labelsAlignRight).toBe(false)
})

test('the property types carry the host default', () => {
  expect(Hosted.properties.rowHeight.getDefaultInstanceOrSnapshot()).toBe(12)
  expect(MSAModelF().properties.rowHeight.getDefaultInstanceOrSnapshot()).toBe(
    defaultRowHeight,
  )
})

test('a zoom reset returns to the host default', () => {
  const model = Hosted.create({
    type: 'MsaView',
    data: { msa },
    colWidth: 30,
    rowHeight: 30,
  })
  model.resetZoom()
  expect(model.colWidth).toBe(5)
  expect(model.rowHeight).toBe(12)
})

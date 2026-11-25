import { getSnapshot, types } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { defaultColWidth, defaultRowHeight } from './constants.ts'
import MSAModelF from './model.ts'

import type { ResidueColorDefault } from './residueColor.ts'

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

test("the library's residueColor holds departures from its defaults", () => {
  const model = MSAModelF().create({ type: 'MsaView', data: { msa } })
  model.setResidueColor({ field: 'feature' })
  expect(model.residueColor).toEqual({})
  expect(model.resolvedResidueColor.field).toBe('feature')
})

const dna: ResidueColorDefault = {
  field: 'residue',
  scale: { scheme: 'jbrowse_dna' },
}

const DnaHost = types.compose(
  'TView',
  MSAModelF({ defaults: { residueColor: dna } }),
  types.model({ type: types.literal('TView') }),
)

test('a host residueColor default colors an unset view', () => {
  const model = DnaHost.create({ type: 'TView', data: { msa } })
  expect(model.residueColor).toEqual({})
  expect(model.resolvedResidueColor).toMatchObject({
    channel: 'fill',
    field: 'residue',
    scheme: 'jbrowse_dna',
  })
  expect(getSnapshot(model).residueColor).toBeUndefined()
})

test("the library's residueColor defaults are a choice under a host's, and travel", () => {
  const model = DnaHost.create({ type: 'TView', data: { msa } })
  model.setResidueColor({ field: 'feature', scale: { scheme: 'maeditor' } })
  expect(model.residueColor).toEqual({
    field: 'feature',
    scale: { scheme: 'maeditor' },
  })

  const reopened = DnaHost.create({
    type: 'TView',
    data: { msa },
    residueColor: getSnapshot(model).residueColor,
  })
  expect(reopened.resolvedResidueColor).toMatchObject({
    field: 'feature',
    scheme: 'maeditor',
  })
})

test('handing the cells to the domains under a host default keeps the field', () => {
  const model = DnaHost.create({ type: 'TView', data: { msa } })
  model.setCellFill('domain')
  expect(model.residueColor).toEqual({ field: 'feature' })
  model.setCellFill('residue')
  expect(model.residueColor).toEqual({})
})

const Ruled = MSAModelF({
  defaults: { turnedOffTracks: { 'position-ruler': false } },
})

const shown = (model: { turnedOnTracks: { model: { id: string } }[] }) =>
  model.turnedOnTracks.map(t => t.model.id)

test('a host turns on a track the library starts off, and the snapshot says nothing', () => {
  const model = Ruled.create({ type: 'MsaView', data: { msa } })
  expect(shown(model)).toContain('position-ruler')
  expect(shown(model)).not.toContain('sequence-logo')
  expect(getSnapshot(model).turnedOffTracks).toBeUndefined()
})

test('turning off a track the host starts on is a choice, and turning it back on is not', () => {
  const model = Ruled.create({ type: 'MsaView', data: { msa } })
  model.toggleTrack('position-ruler')
  expect(shown(model)).not.toContain('position-ruler')
  expect(getSnapshot(model).turnedOffTracks).toEqual({ 'position-ruler': true })
  expect(shown(Ruled.create(getSnapshot(model)))).not.toContain(
    'position-ruler',
  )
  model.toggleTrack('position-ruler')
  expect(getSnapshot(model).turnedOffTracks).toBeUndefined()
})

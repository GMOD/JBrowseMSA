// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { RowPanelSpec } from './types.ts'

const msa = `>duck
MKAA
>chicken
MKAA
>goose
MRAA`

const rowData = {
  duck: { HA: 'H5', NA: 'N1' },
  chicken: { HA: 'H5', NA: 'N8' },
  goose: { HA: 'H7', NA: 'N1' },
}

function makeModel(rowPanels: RowPanelSpec[], width = 800) {
  const model = MSAModelF().create({
    id: 'rowpanels-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    rowPanels,
  })
  model.setWidth(width)
  return model
}

test('a strip colors each row by its field', () => {
  const model = makeModel([
    { kind: 'strip', field: 'HA', scale: { map: { H5: '#e41a1c' } } },
  ])
  const [panel] = model.resolvedRowPanels
  expect(panel!.header).toBe('HA')
  expect([...panel!.colors]).toEqual([
    ['duck', '#e41a1c'],
    ['chicken', '#e41a1c'],
  ])
  expect(panel!.legend).toEqual([{ id: 'H5', label: 'H5', color: '#e41a1c' }])
})

test('a strip is as wide as a row is tall until it says otherwise', () => {
  const model = makeModel([
    { kind: 'strip', field: 'HA' },
    { kind: 'strip', field: 'NA', width: 30 },
  ])
  expect(model.rowHeight).toBe(16)
  expect(model.resolvedRowPanels.map(p => [p.width, p.offsetX])).toEqual([
    [16, 0],
    [30, 16],
  ])
  expect(model.rowPanelsWidth).toBe(46)
})

test('a header names the column, defaulting to the field', () => {
  const model = makeModel([
    { kind: 'strip', field: 'NA', header: 'NA segment' },
  ])
  expect(model.resolvedRowPanels[0]!.header).toBe('NA segment')
})

test('the panels come out of the width the alignment gets', () => {
  const bare = makeModel([])
  const striped = makeModel([
    { kind: 'strip', field: 'HA', width: 12 },
    { kind: 'strip', field: 'NA', width: 12 },
  ])
  expect(striped.msaAreaWidth).toBe(bare.msaAreaWidth - 24)
  expect(striped.msaCanvasWidth).toBe(bare.msaCanvasWidth - 24)
})

test('a strip and an encoding over one field share one legend', () => {
  const model = makeModel([{ kind: 'strip', field: 'HA' }])
  model.setEncodings([{ channel: 'tipLabel', field: 'HA' }])
  expect(model.legends).toHaveLength(1)
  expect(model.legends[0]!.title).toBe('HA')
  expect(model.legends[0]!.entries.map(e => e.id)).toEqual(['H5', 'H7'])
})

test('two strips over one field list it once, and another field follows', () => {
  const model = makeModel([
    { kind: 'strip', field: 'HA' },
    { kind: 'strip', field: 'HA', scale: { palette: 'set1' } },
    { kind: 'strip', field: 'NA' },
  ])
  expect(model.legends.map(l => l.title)).toEqual(['HA', 'NA'])
})

test('strips naming one legend list their values under it once', () => {
  const colors = { map: { H5: '#e41a1c', H7: '#377eb8', N1: '#4daf4a' } }
  const model = makeModel([
    { kind: 'strip', field: 'HA', scale: colors, legend: 'lineage' },
    { kind: 'strip', field: 'NA', scale: colors, legend: 'lineage' },
  ])
  expect(model.legends.map(l => l.title)).toEqual(['lineage'])
  expect(model.legends[0]!.entries.map(e => e.id)).toEqual(['H5', 'H7', 'N1'])
  expect(model.resolvedRowPanels.map(p => p.header)).toEqual(['HA', 'NA'])
})

test('setRowPanels replaces the layer', () => {
  const model = makeModel([])
  expect(model.resolvedRowPanels).toEqual([])
  expect(model.rowPanelsHeaderHeight).toBe(0)
  model.setRowPanels([{ kind: 'strip', field: 'NA' }])
  expect(model.resolvedRowPanels[0]!.field).toBe('NA')
  expect(model.rowPanelsHeaderHeight).toBeGreaterThan(0)
})

test('a field the table lacks colors nothing and lists nothing', () => {
  const model = makeModel([{ kind: 'strip', field: 'host' }])
  expect(model.resolvedRowPanels[0]!.colors.size).toBe(0)
  expect(model.legends).toEqual([])
})

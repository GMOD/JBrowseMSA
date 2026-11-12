// @vitest-environment jsdom
import { autorun } from 'mobx'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { ResolvedStripPanel, RowPanelSpec } from './types.ts'

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
    {
      kind: 'strip',
      encoding: {
        fill: { field: 'HA', scale: { domain: ['H5'], range: ['#e41a1c'] } },
      },
    },
  ])
  const [panel] = model.resolvedRowPanels
  expect(panel!.header).toBe('HA')
  expect([...panel!.colors]).toEqual([
    ['duck', '#e41a1c'],
    ['chicken', '#e41a1c'],
  ])
  expect(panel!.legend).toEqual([
    { value: 'H5', label: 'H5', color: '#e41a1c' },
  ])
})

test('a strip is as wide as a row is tall until it says otherwise', () => {
  const model = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'HA' } } },
    { kind: 'strip', encoding: { fill: { field: 'NA' } }, width: 30 },
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
    {
      kind: 'strip',
      encoding: { fill: { field: 'NA' } },
      header: 'NA segment',
    },
  ])
  expect(model.resolvedRowPanels[0]!.header).toBe('NA segment')
})

test('the panels come out of the width the alignment gets', () => {
  const bare = makeModel([])
  const striped = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'HA' } }, width: 12 },
    { kind: 'strip', encoding: { fill: { field: 'NA' } }, width: 12 },
  ])
  expect(striped.msaAreaWidth).toBe(bare.msaAreaWidth - 24)
  expect(striped.msaCanvasWidth).toBe(bare.msaCanvasWidth - 24)
})

test('a strip and an encoding over one field share one legend', () => {
  const model = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'HA' } } },
  ])
  model.setEncodings([{ channel: 'tipLabel', field: 'HA' }])
  expect(model.legends).toHaveLength(1)
  expect(model.legends[0]!.title).toBe('HA')
  expect(model.legends[0]!.items.map(e => e.value)).toEqual(['H5', 'H7'])
})

test('two strips declaring one scale over one field list it once', () => {
  const model = makeModel([
    {
      kind: 'strip',
      encoding: { fill: { field: 'HA', scale: { scheme: 'set1' } } },
    },
    {
      kind: 'strip',
      encoding: { fill: { field: 'HA', scale: { scheme: 'set1' } } },
    },
    { kind: 'strip', encoding: { fill: { field: 'NA' } } },
  ])
  expect(model.legends.map(l => l.title)).toEqual(['HA', 'NA'])
})

test('two scales over one field list two legends', () => {
  const model = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'HA' } } },
    {
      kind: 'strip',
      encoding: { fill: { field: 'HA', scale: { scheme: 'set1' } } },
    },
  ])
  expect(model.legends.map(l => l.title)).toEqual(['HA', 'HA'])
  expect(new Set(model.legends.map(l => l.id)).size).toBe(2)
})

test('strips naming one title list their values under it once', () => {
  const colors = {
    scale: {
      domain: ['H5', 'H7', 'N1'],
      range: ['#e41a1c', '#377eb8', '#4daf4a'],
    },
    legend: { title: 'lineage' },
  }
  const model = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'HA', ...colors } } },
    { kind: 'strip', encoding: { fill: { field: 'NA', ...colors } } },
  ])
  expect(model.legends.map(l => l.title)).toEqual(['lineage'])
  expect(model.legends[0]!.items.map(e => e.value)).toEqual(['H5', 'H7', 'N1'])
  expect(model.resolvedRowPanels.map(p => p.header)).toEqual(['HA', 'NA'])
})

test('two strips over one palette and title color a shared value alike', () => {
  const model = MSAModelF().create({
    id: 'shared-value',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: {
      msa,
      treeMetadata: JSON.stringify({
        duck: { PB2: 'am2.2', PB1: 'am4' },
        chicken: { PB2: 'am4', PB1: 'eu1' },
      }),
    },
    rowPanels: [
      {
        kind: 'strip',
        encoding: {
          fill: {
            field: 'PB2',
            scale: { scheme: 'set1' },
            legend: { title: 'segment lineage' },
          },
        },
      },
      {
        kind: 'strip',
        encoding: {
          fill: {
            field: 'PB1',
            scale: { scheme: 'set1' },
            legend: { title: 'segment lineage' },
          },
        },
      },
    ],
  })
  const [pb2, pb1] = model.resolvedRowPanels as ResolvedStripPanel[]
  const am4 = pb2!.colors.get('chicken')
  expect(pb1!.colors.get('duck')).toBe(am4)
  const [legend] = model.legends
  expect(model.legends).toHaveLength(1)
  expect(legend!.items).toEqual([
    { value: 'am2.2', label: 'am2.2', color: pb2!.colors.get('duck') },
    { value: 'am4', label: 'am4', color: am4 },
    { value: 'eu1', label: 'eu1', color: pb1!.colors.get('chicken') },
  ])
})

test('setRowPanels replaces the layer', () => {
  const model = makeModel([])
  expect(model.resolvedRowPanels).toEqual([])
  expect(model.rowPanelsHeaderHeight).toBe(0)
  model.setRowPanels([{ kind: 'strip', encoding: { fill: { field: 'NA' } } }])
  expect(model.resolvedRowPanels[0]!.field).toBe('NA')
  expect(model.rowPanelsHeaderHeight).toBeGreaterThan(0)
})

test('a zoom reuses the legends and the panel scales', () => {
  const model = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'HA' } } },
    { kind: 'features', x: 'column' },
  ])
  model.applyGFFText(`##gff-version 3
duck\tPfam\tprotein_match\t1\t3\t.\t+\t.\tName=PF00001`)
  let runs = 0
  const dispose = autorun(() => {
    runs++
    void model.legends
    void model.rowPanelScales
  })
  const { legends, rowPanelScales } = model
  model.setColWidth(model.colWidth * 2)
  model.setRowHeight(model.rowHeight * 2)
  expect(model.legends).toBe(legends)
  expect(model.rowPanelScales).toBe(rowPanelScales)
  expect(runs).toBe(1)
  dispose()
})

test('a features panel without its own color reuses featureColors', () => {
  const model = makeModel([{ kind: 'features', x: 'column' }])
  model.applyGFFText(`##gff-version 3
duck\tPfam\tprotein_match\t1\t3\t.\t+\t.\tName=PF00001`)
  const dispose = autorun(() => {
    void model.resolvedRowPanels
    void model.featureColors
  })
  const [panel] = model.resolvedRowPanels
  expect(panel!.kind === 'features' && panel!.colors).toBe(model.featureColors)
  dispose()
})

test('a field the table lacks colors nothing and lists nothing', () => {
  const model = makeModel([
    { kind: 'strip', encoding: { fill: { field: 'host' } } },
  ])
  expect(model.resolvedRowPanels[0]!.colors.size).toBe(0)
  expect(model.legends).toEqual([])
})

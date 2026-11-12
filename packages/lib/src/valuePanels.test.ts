// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type {
  ResolvedFeaturePanel,
  ResolvedTextPanel,
  ResolvedValuePanel,
  RowPanelSpec,
} from './types.ts'

const msa = `>duck
MKAA
>chicken
MKAA
>goose
MRAA`

const rowData = {
  duck: { size: '4600000', host: 'wild', clade: '2.3.4.4b' },
  chicken: { size: '2100000', host: 'poultry', clade: '2.3.2.1a' },
  goose: { size: 'unknown', host: 'wild' },
}

function makeModel(rowPanels: RowPanelSpec[]) {
  const model = MSAModelF().create({
    id: 'valuepanels-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    rowPanels,
  })
  model.setWidth(800)
  return model
}

test('a bar panel reads each row number, and starts its scale at 0', () => {
  const model = makeModel([{ kind: 'bar', encoding: { x: { field: 'size' } } }])
  const panel = model.resolvedRowPanels[0] as ResolvedValuePanel
  expect(panel.width).toBe(80)
  expect(panel.header).toBe('size')
  expect([...panel.values]).toEqual([
    ['duck', 4_600_000],
    ['chicken', 2_100_000],
  ])
  expect(panel.axis.scale).toEqual({ type: 'linear', domain: [0, 4_600_000] })
  expect(panel.axis.extent).toEqual([1, 79])
})

test('a point panel follows its values at both ends, inset by its radius', () => {
  const model = makeModel([
    { kind: 'point', encoding: { x: { field: 'size' } }, size: 8, width: 100 },
  ])
  const panel = model.resolvedRowPanels[0] as ResolvedValuePanel
  expect(panel.size).toBe(8)
  expect(panel.axis.scale.domain).toEqual([2_100_000, 4_600_000])
  expect(panel.axis.extent).toEqual([5, 95])
})

test('pinned ends and a log scale', () => {
  const model = makeModel([
    {
      kind: 'bar',
      encoding: {
        x: {
          field: 'size',
          scale: { type: 'log', domainMin: 1e6, domainMax: 1e7 },
        },
      },
    },
  ])
  const panel = model.resolvedRowPanels[0] as ResolvedValuePanel
  expect(panel.axis.scale).toEqual({ type: 'log', domain: [1e6, 1e7] })
})

test('a bar colored by another field lists that scale in the legends', () => {
  const model = makeModel([
    {
      kind: 'bar',
      encoding: {
        x: { field: 'size' },
        color: {
          field: 'host',
          scale: { domain: ['wild', 'poultry'], range: ['#1b9e77', '#d95f02'] },
        },
      },
    },
  ])
  const panel = model.resolvedRowPanels[0] as ResolvedValuePanel
  expect(panel.colorField).toBe('host')
  expect(panel.colors.get('chicken')).toBe('#d95f02')
  expect(model.colorRecords.map(r => r.record)).toEqual([
    'rowPanels[0].encoding.color',
  ])
  expect(model.legends.map(l => l.title)).toEqual(['host'])
})

test('a bar with no color lists no legend', () => {
  const model = makeModel([{ kind: 'bar', encoding: { x: { field: 'size' } } }])
  expect(model.legends).toEqual([])
  expect((model.resolvedRowPanels[0] as ResolvedValuePanel).colors.size).toBe(0)
})

test('a value scale reports its ends', () => {
  const model = makeModel([
    {
      kind: 'bar',
      encoding: {
        x: { field: 'size', scale: { domainMin: 10, domainMax: 1 } },
      },
    },
  ])
  expect(model.scaleProblems.map(p => [p.record, p.rule])).toEqual([
    ['rowPanels[0].encoding.x', 'domain-ends'],
  ])
})

test('a text panel prints its field, for the rows holding one', () => {
  const model = makeModel([
    { kind: 'text', encoding: { text: { field: 'clade' } }, header: 'clade' },
  ])
  const panel = model.resolvedRowPanels[0] as ResolvedTextPanel
  expect(panel.width).toBe(80)
  expect(panel.axis).toBeUndefined()
  expect([...panel.texts]).toEqual([
    ['duck', '2.3.4.4b'],
    ['chicken', '2.3.2.1a'],
  ])
})

test('a features panel over positions carries an axis, zero at the aligned feature', () => {
  const model = makeModel([
    {
      kind: 'features',
      x: 'position',
      width: 300,
      transform: [{ type: 'align', on: 'genB' }],
    },
  ])
  model.applyGFFText(`##gff-version 3
duck\tx\tgene\t1\t1000\t.\t+\t.\tName=genA
duck\tx\tgene\t3001\t4000\t.\t+\t.\tName=genB
chicken\tx\tgene\t1\t1000\t.\t+\t.\tName=genB`)
  const panel = model.resolvedRowPanels[0] as ResolvedFeaturePanel
  expect(panel.axis?.scale.domain).toEqual([-3000, 1000])
  expect(panel.axis?.extent).toEqual([0, 299])
  expect(panel.axis?.format(-2000, 1000)).toBe('-2 kb')
})

test('a features panel over columns carries no axis', () => {
  const model = makeModel([{ kind: 'features', x: 'column' }])
  model.applyGFFText(`##gff-version 3
duck\tx\tgene\t1\t3\t.\t+\t.\tName=genA`)
  expect(model.resolvedRowPanels[0]!.axis).toBeUndefined()
})

test('a color value hidden through the legend hides the marks reading it', () => {
  const model = makeModel([
    {
      kind: 'bar',
      encoding: { x: { field: 'size' }, color: { field: 'host' } },
    },
    {
      kind: 'text',
      encoding: { text: { field: 'clade' }, color: { field: 'host' } },
    },
  ])
  model.setHiddenCategories([{ field: 'host', value: 'wild' }])
  const [bar, text] = model.resolvedRowPanels as [
    ResolvedValuePanel,
    ResolvedTextPanel,
  ]
  expect([...bar.hiddenRows]).toEqual(['duck', 'goose'])
  expect([...text.hiddenRows]).toEqual(['duck', 'goose'])
  expect(bar.colors.has('duck')).toBe(false)
  expect(bar.colors.has('chicken')).toBe(true)
})

test('an identity scale paints each mark the color its field names', () => {
  const model = MSAModelF().create({
    id: 'valuepanels-identity',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: {
      msa,
      treeMetadata: JSON.stringify({
        duck: { size: '3', ink: '#e41a1c' },
        chicken: { size: '5', ink: '#377eb8' },
      }),
    },
    rowPanels: [
      {
        kind: 'point',
        encoding: {
          x: { field: 'size' },
          color: {
            field: 'ink',
            scale: { type: 'identity', domain: ['#e41a1c'] },
            legend: { labels: ['wild'] },
          },
        },
      },
    ],
  })
  const panel = model.resolvedRowPanels[0] as ResolvedValuePanel
  expect([...panel.colors]).toEqual([
    ['duck', '#e41a1c'],
    ['chicken', '#377eb8'],
  ])
  // the legend lists the colors the scale's domain names
  expect(model.legends[0]!.items).toEqual([
    { value: '#e41a1c', label: 'wild', color: '#e41a1c' },
  ])
})

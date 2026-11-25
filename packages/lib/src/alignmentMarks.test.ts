import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { expect, test } from 'vitest'

import { markProblems, markSpanHeight } from './alignmentMarks.ts'
import {
  domainOverlaySource,
  markOverlaySource,
} from './components/msa/renderBoxFeatureCanvasBlock.ts'
import { domainUnderlineHeight } from './constants.ts'
import stateModelFactory from './model.ts'

import type { AlignmentMarkSpec, Feature } from './types.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'
const msa = `>a\n${row}\n>b\n${row}`

const features: Feature[] = [
  { row: 'a', start: 1, end: 10, name: 'geneA', type: 'gene' },
  { row: 'a', start: 3, end: 3, type: 'modified_base', probability: 90 },
  { row: 'a', start: 5, end: 5, type: 'modified_base', probability: 10 },
  { row: 'b', start: 1, end: 20, name: 'geneB', type: 'gene' },
]

const probability: AlignmentMarkSpec = {
  kind: 'features',
  filter: [{ field: 'type', oneOf: ['modified_base'] }],
  height: { band: 1 },
  encoding: {
    fill: {
      field: 'probability',
      scale: {
        type: 'linear',
        domainMin: 0,
        domainMax: 100,
        range: ['#0000ff', '#ff0000'],
      },
      legend: { title: 'modification %' },
    },
  },
}

const genes: AlignmentMarkSpec = {
  kind: 'features',
  filter: [{ field: 'type', oneOf: ['gene'] }],
  height: 3,
}

function makeModel(marks?: AlignmentMarkSpec[]) {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa },
    features,
    ...(marks ? { marks } : {}),
  })
  model.setWidth(1000)
  return model
}

const accessionsOf = (bands: { annotation: { start: number } }[] = []) =>
  bands.map(b => b.annotation.start)

test('unset marks draw one mark over every feature, with the overlay maps', () => {
  const model = makeModel()
  const dispose = autorun(() => {
    void model.resolvedMarks
    void model.markBandsByStart
  })
  expect(model.alignmentMarks).toEqual([{ index: 0 }])
  const [mark] = model.resolvedMarks
  expect(mark!.bands).toBe(model.domainBands)
  expect(mark!.colors).toBe(model.featureColors)
  expect(model.markedBands).toBe(model.domainBands)
  expect(model.markBandsByStart[0]).toBe(model.domainBandsByStart)
  expect(model.cellFill).toBe('domain')
  expect(getSnapshot(model).marks).toBeUndefined()
  expect(JSON.stringify(getSnapshot(model))).not.toContain('"marks"')
  dispose()
})

test('an empty list draws no mark, and the residues keep the cells', () => {
  const model = makeModel([])
  expect(model.resolvedMarks).toEqual([])
  expect(model.cellFill).toBe('residue')
  expect(model.markedBands.size).toBe(0)
  expect(model.legends.map(l => l.id)).toEqual([])
  model.setMousePos(2, 0)
  expect(model.mouseOverDomains).toEqual([])
  expect(getSnapshot(model).marks).toEqual([])
})

test('a filter keeps the features passing every test, read off the feature table', () => {
  const model = makeModel([probability, genes])
  const [calls, spans] = model.resolvedMarks
  expect(accessionsOf(calls!.bands.get('a'))).toEqual([3, 5])
  expect(calls!.bands.has('b')).toBe(false)
  expect(accessionsOf(spans!.bands.get('a'))).toEqual([1])
  expect(accessionsOf(spans!.bands.get('b'))).toEqual([1])

  model.setMarks([
    {
      kind: 'features',
      filter: [
        { field: 'type', oneOf: ['modified_base'] },
        { field: 'probability', range: [50, null] },
      ],
    },
  ])
  expect(accessionsOf(model.resolvedMarks[0]!.bands.get('a'))).toEqual([3])
})

test('a feature passing two marks draws in each, and one passing none in neither', () => {
  const model = makeModel([genes, { kind: 'features' }])
  const [first, second] = model.resolvedMarks
  expect(accessionsOf(first!.bands.get('a'))).toEqual([1])
  expect(accessionsOf(second!.bands.get('a'))).toEqual([1, 3, 5])

  model.setMarks([genes])
  model.setMousePos(2, 0)
  expect(model.mouseOverDomains.map(a => a.start)).toEqual([1])
  model.setMarks([probability])
  model.setMousePos(2, 0)
  expect(model.mouseOverDomains.map(a => a.start)).toEqual([3])
  model.setMousePos(1, 0)
  expect(model.mouseOverDomains).toEqual([])
})

test('the filter dialog and a legend click apply before any mark', () => {
  const model = makeModel([probability, { kind: 'features' }])
  model.setFilter('geneA', false)
  expect(accessionsOf(model.resolvedMarks[1]!.bands.get('a'))).toEqual([3, 5])
})

test('every mark in a row packs into one set of lanes under the sub-row layout', () => {
  const model = makeModel([genes, probability])
  model.setSubFeatureRows(true)
  const lanes = model.resolvedMarks.flatMap(mark =>
    (mark.bands.get('a') ?? []).map(b => [b.annotation.start, b.lane]),
  )
  expect(lanes).toEqual([
    [1, 0],
    [3, 1],
    [5, 1],
  ])
  expect(model.markedBands.get('a')![0]!.laneCount).toBe(2)
})

test('a mark resolves its own fill and text, else the top-level encodings', () => {
  const model = makeModel([probability, { kind: 'features' }])
  model.setEncodings([{ channel: 'featureLabel', field: 'name' }])
  const [calls, all] = model.resolvedMarks
  const call = calls!.bands.get('a')![0]!.annotation
  expect(calls!.colors.get(call)!.fill).toBe('#e60019')
  expect(all!.colors).toStrictEqual(model.featureColors)
  expect(calls!.labels).toStrictEqual(model.featureLabels)

  model.setMarks([
    {
      kind: 'features',
      encoding: { fill: { value: '#123456' }, text: { field: 'type' } },
    },
  ])
  const [own] = model.resolvedMarks
  const exon = own!.bands.get('b')![0]!.annotation
  expect(own!.colors.get(exon)!.fill).toBe('#123456')
  expect(own!.labels!.get(exon)).toBe('gene')
})

test('a feature color wins over the mark scale', () => {
  const model = makeModel([probability])
  model.setFeatures([
    {
      row: 'a',
      start: 3,
      end: 3,
      type: 'modified_base',
      probability: 90,
      color: '#00ff00',
    },
  ])
  const [calls] = model.resolvedMarks
  const call = calls!.bands.get('a')![0]!.annotation
  expect(calls!.colors.get(call)!.fill).toBe('#00ff00')
})

test("a mark's scale lists a legend while drawn and merges with a panel declaring it", () => {
  const model = makeModel([probability, genes])
  expect(model.legends.map(l => l.title)).toEqual(['modification %', 'Domains'])
  // the gene mark names no fill, so the domain key lists the genes it draws
  // and leaves out the calls the other mark colors
  expect(model.legends[1]!.items.map(i => i.label)).toEqual(['geneA', 'geneB'])
  expect(model.colorRecords.map(r => r.record)).toEqual([
    'marks[0].encoding.fill',
  ])

  model.setRowPanels([
    {
      kind: 'features',
      x: 'column',
      encoding: { fill: probability.encoding!.fill },
    },
  ])
  expect(model.legends.filter(l => l.title === 'modification %')).toHaveLength(
    1,
  )

  model.setShowDomains(false)
  expect(model.legends.map(l => l.title)).toEqual(['modification %'])
})

test("a mark's color object reports its problems under its record", () => {
  const model = makeModel([
    {
      kind: 'features',
      encoding: {
        fill: {
          field: 'probability',
          scale: { type: 'linear', domainMin: 100, domainMax: 0 },
        },
      },
    },
  ])
  expect(model.scaleProblems.map(p => `${p.record}.${p.slot}`)).toEqual([
    'marks[0].encoding.fill.scale.domainMax',
  ])
})

test('a record the viewer cannot draw as written is reported and drawn without the member', () => {
  const marks: unknown[] = [
    { kind: 'point' },
    { kind: 'features', height: { band: 1.5 } },
    { kind: 'features', height: 0 },
    {
      kind: 'features',
      filter: [{ oneOf: ['exon'] }, { field: 'type', oneOf: ['exon'] }],
    },
  ]
  expect(
    markProblems(marks).map(p => [p.rule, `${p.record}.${p.slot}`]),
  ).toEqual([
    ['mark-kind', 'marks[0].kind'],
    ['mark-height', 'marks[1].height.band'],
    ['mark-height', 'marks[2].height'],
    ['mark-filter', 'marks[3].filter[0]'],
  ])
  const model = makeModel()
  model.setMarks([
    { kind: 'features', height: { band: 1.5 } },
    { kind: 'features', height: -2 },
    {
      kind: 'features',
      filter: [
        { field: '', oneOf: ['x'] },
        { field: 'type', oneOf: ['exon'] },
      ],
    },
  ])
  expect(model.markProblems).toHaveLength(3)
  expect(model.alignmentMarks).toEqual([
    { index: 0 },
    { index: 1 },
    { index: 2, filter: [{ field: 'type', oneOf: ['exon'] }] },
  ])
})

test('height takes pixels or a band of the row, drawn as written at every zoom', () => {
  expect(markSpanHeight(3, { rowHeight: 15, underline: false })).toEqual({
    h: 3,
    bar: true,
  })
  expect(
    markSpanHeight({ band: 1 }, { rowHeight: 15, underline: true }),
  ).toEqual({ h: 15, bar: false })
  expect(
    markSpanHeight({ band: 0.4 }, { rowHeight: 10, underline: false }),
  ).toEqual({ h: 4, bar: true })
  expect(markSpanHeight(40, { rowHeight: 15, underline: true })).toEqual({
    h: 15,
    bar: false,
  })
})

test('an unset height follows the cell fill and the letters', () => {
  const model = makeModel([{ kind: 'features' }])
  const layoutOf = () => {
    const leaf = model.leaves[0]!
    const { source, bar } = markOverlaySource(model, model.resolvedMarks[0]!, [
      leaf,
    ])
    return { h: source.layout.height(1), bar }
  }
  expect(model.cellFill).toBe('domain')
  expect(layoutOf()).toEqual({ h: model.rowHeight, bar: false })

  model.setCellFill('residue')
  expect(model.showMsaLetters).toBe(true)
  expect(layoutOf()).toEqual({ h: domainUnderlineHeight, bar: true })

  model.setCellFill('none')
  expect(layoutOf()).toEqual({ h: domainUnderlineHeight, bar: true })

  model.setRowHeight(3)
  model.setColWidth(2)
  expect(model.showMsaLetters).toBe(false)
  expect(layoutOf()).toEqual({ h: model.rowHeight, bar: false })
})

test('the domain fill needs some mark to draw a feature', () => {
  const model = makeModel([
    { kind: 'features', filter: [{ field: 'type', oneOf: ['repeat'] }] },
  ])
  expect(model.cellFill).toBe('residue')
  model.setMarks([genes])
  expect(model.cellFill).toBe('domain')
})

test('a row-table change or a re-sort leaves the marks as they are', () => {
  const model = makeModel([probability, genes])
  model.setEncodings([{ channel: 'tipLabel', field: 'order' }])
  const drawn: unknown[] = []
  const dispose = autorun(() => {
    drawn.push(model.resolvedMarks)
  })
  model.setRowData({ a: { order: '2' }, b: { order: '1' } })
  model.setRowTransform({ sort: [{ field: 'order' }] })
  expect(model.rowNames).toEqual(['b', 'a'])
  dispose()
  expect(drawn).toHaveLength(1)
})

test('domainOverlaySource is the first mark, and no rows with no mark', () => {
  const model = makeModel()
  expect(domainOverlaySource(model, model.leaves).rows).toHaveLength(2)
  model.setMarks([genes])
  expect(
    domainOverlaySource(model, model.leaves).rows.map(r => r.bands.length),
  ).toEqual([1, 1])
  model.setMarks([])
  expect(domainOverlaySource(model, model.leaves).rows).toEqual([])
})

// @vitest-environment jsdom
//
// A click on a categorical legend row hides that value (jbrowse-components'
// ADR-246): a row's marks draw unpainted, a feature leaves the overlay and the
// panels, the on-screen legend strikes the row through, and the export leaves
// it out. A row of the accession key toggles the filter dialog's
// `turnedOffFeatures`.
import React from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { beforeAll, expect, test } from 'vitest'

import AnnotationLegend from './components/msa/AnnotationLegend.tsx'
import { renderToStaticMarkup } from './renderToStaticMarkup.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { LegendSection } from './legendSpec.ts'
import type { MsaViewModel } from './model.ts'
import type { ColumnTrackSpec, Encoding, RowPanelSpec } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const row = 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKL'
const msa = `>human\n${row}\n>mouse\n${row}\n>chicken\n${row}`

const rowData = {
  human: { clade: 'mammal', host: 'mammal' },
  mouse: { clade: 'mammal', host: 'bird' },
  chicken: { clade: 'bird', host: 'bird' },
}

const gff = [
  '##gff-version 3',
  'human\tsrc\tprotein_match\t1\t10\t.\t.\t.\tName=kinase;group=enzyme',
  'mouse\tsrc\tprotein_match\t1\t10\t.\t.\t.\tName=myb;group=binder',
].join('\n')

function makeModel({
  encodings = [],
  rowPanels = [],
  columnTracks = [],
}: {
  encodings?: Encoding[]
  rowPanels?: RowPanelSpec[]
  columnTracks?: ColumnTrackSpec[]
}) {
  const model = createTestModel({
    id: 'hidden-categories-test',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    encodings,
    rowPanels,
    columnTracks,
  })
  model.applyGFFText(gff)
  return model
}

function sectionTitled(model: MsaViewModel, title: string): LegendSection {
  return model.legends.find(s => s.title === title)!
}

function click(model: MsaViewModel, title: string, value: string) {
  model.toggleLegendItem(sectionTitled(model, title).hides!, value)
}

const strip: RowPanelSpec = {
  kind: 'strip',
  encoding: { fill: { field: 'clade' } },
}

test('a hidden row value leaves its strip cell and tip label unpainted', () => {
  const model = makeModel({
    encodings: [{ channel: 'tipLabel', field: 'clade' }],
    rowPanels: [strip],
  })
  click(model, 'clade', 'bird')

  const [panel] = model.resolvedRowPanels
  expect(panel?.kind === 'strip' && [...panel.colors.keys()]).toEqual([
    'human',
    'mouse',
  ])
  expect(model.tipLabelColors?.has('chicken')).toBe(false)
  expect(model.tipLabelColors?.has('human')).toBe(true)
  expect(sectionTitled(model, 'clade').items).toEqual([
    { value: 'bird', label: 'bird', color: '#F8766D', hidden: true },
    { value: 'mammal', label: 'mammal', color: '#00BFC4' },
  ])
})

test('the hide travels in the snapshot, and a second click shows the value', () => {
  const model = makeModel({ rowPanels: [strip] })
  click(model, 'clade', 'bird')
  expect(getSnapshot(model).hiddenCategories).toEqual([
    { field: 'clade', value: 'bird' },
  ])

  click(model, 'clade', 'bird')
  expect(getSnapshot(model).hiddenCategories).toBeUndefined()
  const [panel] = model.resolvedRowPanels
  expect(panel?.kind === 'strip' && panel.colors.has('chicken')).toBe(true)
})

test('a row of a legend two fields share hides the value in both', () => {
  const shared = { legend: { title: 'lineage' } }
  const model = makeModel({
    rowPanels: [
      { kind: 'strip', encoding: { fill: { field: 'clade', ...shared } } },
      { kind: 'strip', encoding: { fill: { field: 'host', ...shared } } },
    ],
  })
  click(model, 'lineage', 'bird')

  expect(model.hiddenCategories).toEqual([
    { field: 'clade', value: 'bird' },
    { field: 'host', value: 'bird' },
  ])
  const colored = model.resolvedRowPanels.map(panel =>
    panel.kind === 'strip' ? [...panel.colors.keys()] : [],
  )
  expect(colored).toEqual([['human', 'mouse'], ['human']])
})

test('a hide waits while no categorical scale reads its field', () => {
  const model = makeModel({})
  model.setHiddenCategories([{ field: 'clade', value: 'bird' }])
  expect(model.activeHiddenCategories.size).toBe(0)

  model.setRowPanels([strip])
  expect(model.activeHiddenCategories.get('rows')?.get('clade')).toEqual(
    new Set(['bird']),
  )
})

test('a ramp lists no row a click hides', () => {
  const model = makeModel({
    encodings: [
      {
        channel: 'tipLabel',
        field: 'clade',
        scale: { type: 'threshold', domain: [1] },
      },
    ],
  })
  expect(sectionTitled(model, 'clade').hides).toBeUndefined()
})

test('a hidden feature value leaves the overlay and stays in the legend', () => {
  const model = makeModel({
    encodings: [{ channel: 'featureFill', field: 'group' }],
  })
  click(model, 'group', 'enzyme')

  expect(model.filteredAnnotations.map(a => a.accession)).toEqual(['myb'])
  expect(Object.keys(model.annotationsByRow)).toEqual(['mouse'])
  expect(
    sectionTitled(model, 'group').items.map(i => [i.value, !!i.hidden]),
  ).toEqual([
    ['binder', false],
    ['enzyme', true],
  ])
})

test('a hidden value drops the spans of a features track', () => {
  const model = makeModel({
    columnTracks: [
      {
        id: 'sites',
        name: 'sites',
        kind: 'features',
        features: [
          { start: 1, end: 3, name: 'a', site: 'active' },
          { start: 5, end: 7, name: 'b', site: 'binding' },
        ],
        encoding: { fill: { field: 'site' } },
      },
    ],
  })
  click(model, 'site', 'active')

  const spans = model.columnTrackContent.get('sites')?.spans ?? []
  expect(spans.map(s => s.annotation.name)).toEqual(['b'])
})

test('a row of the accession key toggles the filter dialog state', () => {
  const model = makeModel({})
  const domains = sectionTitled(model, 'Domains')
  expect(domains.hides).toEqual({ kind: 'featureType' })

  model.toggleLegendItem(domains.hides!, 'myb')
  expect(model.featureOff('myb')).toBe(true)
  expect(model.hiddenCategories).toEqual([])
  expect(
    sectionTitled(model, 'Domains').items.map(i => [i.value, !!i.hidden]),
  ).toEqual([
    ['kinase', false],
    ['myb', true],
  ])

  model.toggleLegendItem(domains.hides!, 'myb')
  expect(model.featureOff('myb')).toBe(false)
})

test('the overlay strikes a hidden row through, and the export leaves it out', async () => {
  const model = makeModel({ rowPanels: [strip] })
  click(model, 'clade', 'bird')

  const html = renderToStaticMarkup(<AnnotationLegend model={model} />)
  expect(html).toMatch(/text-decoration: line-through[^>]*>bird</)
  expect(html).toContain('aria-pressed="false"')

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  expect(svg).toContain('>mammal</text>')
  expect(svg).not.toContain('>bird</text>')
})

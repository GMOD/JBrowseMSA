// @vitest-environment jsdom
//
// The first readers of a continuous scale: a strip over a numeric rowData
// field and featureFill over a numeric GFF attribute, each listing a gradient
// legend, and the scale problems the model reports and the legend notes.
import React from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import AnnotationLegend from './components/msa/AnnotationLegend.tsx'
import { renderToStaticMarkup } from './renderToStaticMarkup.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { MsaViewModel } from './model.ts'
import type { Encoding, RowPanelSpec } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const msa = '>duck\nMKAA\n>chicken\nMKAA\n>goose\nMRAA'
const rowData = {
  duck: { year: '2019', collected: '2001' },
  chicken: { year: '2023', collected: '2002' },
  goose: { year: '2021', collected: '2003' },
}

function stripModel(rowPanels: RowPanelSpec[], encodings: Encoding[] = []) {
  return createTestModel({
    id: 'ramp-legend-test',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    rowPanels,
    encodings,
  })
}

const pinnedYears = {
  type: 'linear' as const,
  scheme: 'viridis',
  domainMin: 2000,
  domainMax: 2023,
}

function exportEntire(model: MsaViewModel) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
}

test('a strip over a numeric field reads it through a ramp', () => {
  const model = stripModel([
    {
      kind: 'strip',
      encoding: { fill: { field: 'year', scale: { type: 'linear' } } },
    },
  ])
  const colors = model.resolvedRowPanels.flatMap(panel =>
    panel.kind === 'strip' ? [panel.colors] : [],
  )[0]
  expect(colors?.get('duck')).toBe('#440154')
  expect(colors?.get('chicken')).toBe('#fde725')
  const [section] = model.legends
  expect(model.legends).toHaveLength(1)
  expect(section).toMatchObject({ id: 'rowData-year', title: 'year' })
  expect(section!.items).toHaveLength(1)
  expect(section!.items[0]!.gradient).toMatchObject({
    minLabel: '2019',
    maxLabel: '2023',
  })
})

test('two strips over one pinned ramp share a legend, and open ones do not', () => {
  const strip = (
    field: string,
    scale: typeof pinnedYears | { type: 'linear' },
  ) => ({ kind: 'strip', encoding: { fill: { field, scale } } }) as const
  expect(
    stripModel([strip('year', pinnedYears), strip('collected', pinnedYears)])
      .legends,
  ).toHaveLength(1)
  expect(
    stripModel([
      strip('year', { type: 'linear' }),
      strip('collected', { type: 'linear' }),
    ]).legends,
  ).toHaveLength(2)
})

test('a strip over numbers on the default scale notes the ramp member', () => {
  const model = stripModel([
    { kind: 'strip', encoding: { fill: { field: 'year' } } },
  ])
  expect(model.legends[0]!.note).toContain('scale: {type: "linear"}')
})

test('featureFill reads a numeric attribute through a threshold scale', () => {
  const model = createTestModel({
    id: 'ramp-feature-test',
    data: {
      msa: '>seq1\nACDEFGHIKLMNPQRSTVWY\n>seq2\nACDEFGHIKLMNPQRSTVWY',
    },
  })
  model.applyGFFText(
    [
      '##gff-version 3',
      'seq1\tsrc\tregion\t1\t10\t.\t.\t.\tName=a;plddt=95',
      'seq2\tsrc\tregion\t1\t10\t.\t.\t.\tName=b;plddt=40',
    ].join('\n'),
  )
  model.setEncodings([
    {
      channel: 'featureFill',
      field: 'plddt',
      scale: {
        type: 'threshold',
        domain: [50, 70, 90],
        range: ['#ff7d45', '#ffdb13', '#65cbf3', '#0053d6'],
      },
    },
  ])
  const fills = model.filteredAnnotations.map(
    a => model.featureColors.get(a)!.fill,
  )
  expect(fills).toEqual(['#0053d6', '#ff7d45'])
  expect(model.legends[0]!.items.map(i => i.label)).toEqual([
    '< 50',
    '50 – 70',
    '70 – 90',
    '≥ 90',
  ])
})

test('the export draws a ramp as a linearGradient in defs', async () => {
  const model = stripModel([
    {
      kind: 'strip',
      encoding: { fill: { field: 'year', scale: pinnedYears } },
    },
  ])
  const svg = await exportEntire(model)
  expect(svg).toMatch(
    /<defs><linearGradient id="ramp-legend-test-legend-gradient-0"[^>]*>(<stop offset="[\d.]+" stop-color="#[0-9a-f]{6}"><\/stop>){11}<\/linearGradient><\/defs>/,
  )
  expect(svg).toContain('fill="url(#ramp-legend-test-legend-gradient-0)"')
  expect(svg).toContain('>2000</text>')
  expect(svg).toContain('>2023</text>')
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  expect(doc.querySelector('parsererror')).toBeNull()
})

test('the overlay draws a ramp as a CSS gradient with its ends', () => {
  const model = stripModel([
    {
      kind: 'strip',
      encoding: { fill: { field: 'year', scale: pinnedYears } },
    },
  ])
  const html = renderToStaticMarkup(<AnnotationLegend model={model} />)
  expect(html).toContain('linear-gradient(to right, rgb(68, 1, 84) 0%')
  expect(html).toContain('>2000</span>')
  expect(html).toContain('>year</div>')
})

test('scaleProblems lists each record, and the legend notes the first', async () => {
  const model = stripModel(
    [
      {
        kind: 'strip',
        encoding: {
          fill: {
            field: 'year',
            scale: { type: 'linear', domainMin: 2023, domainMax: 2000 },
          },
        },
      },
    ],
    [
      {
        channel: 'tipLabel',
        field: 'year',
        scale: { type: 'threshold', domain: [2020], range: ['red'] },
      },
    ],
  )
  expect(
    model.scaleProblems.map(({ record, slot, rule }) => [record, slot, rule]),
  ).toEqual([
    ['encodings[0]', 'scale.range', 'threshold-range'],
    ['rowPanels[0].encoding.fill', 'scale.domainMax', 'domain-ends'],
  ])
  const notes = model.legends.map(l => l.note)
  expect(notes[0]).toContain('range lists 1')
  expect(notes[1]).toContain('domainMax is below domainMin')
  const svg = await exportEntire(model)
  expect(svg).toContain('font-style="italic"')
})

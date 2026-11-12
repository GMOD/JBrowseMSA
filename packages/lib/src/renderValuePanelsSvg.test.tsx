// @vitest-environment jsdom
//
// The `bar`, `point` and `text` row panels in the SVG export: a mark per row
// at its value along the panel, the axis in the header band under its title,
// and a text column.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { RowPanelSpec } from './types.ts'

const msa = `>duck
ACDEFG
>chicken
ACDEFG
>goose
ACDEFG`

const rowData = {
  duck: { size: '4000000', host: 'wild', clade: '2.3.4.4b' },
  chicken: { size: '2000000', host: 'poultry', clade: '2.3.2.1a' },
  goose: { host: 'wild' },
}

async function exportWith(
  rowPanels: RowPanelSpec[],
  hiddenCategories: { field: string; value: string }[] = [],
) {
  installSvgTestEnv()
  const model = createTestModel({
    id: 'valuepanels-svg-test',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    rowPanels,
    hiddenCategories,
  })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

const group = (svg: string, id: string) =>
  new RegExp(`<g id="${id}">([\\s\\S]*?)</g></g>`).exec(svg)?.[1] ?? ''

const attr = (tag: string, name: string) =>
  Number(new RegExp(` ${name}="([^"]+)"`).exec(tag)?.[1])

test('a bar per row, as long as its value along the axis', async () => {
  const { svg } = await exportWith([
    {
      kind: 'bar',
      encoding: {
        x: { field: 'size' },
        color: {
          field: 'host',
          scale: { domain: ['wild', 'poultry'], range: ['#1b9e77', '#d95f02'] },
        },
      },
      width: 101,
    },
  ])
  const bars = group(svg, 'rowpanel-0').match(/<rect[^>]*>/g) ?? []
  // goose has no size, so two bars, from the extent's left end at 0
  expect(bars).toHaveLength(2)
  expect(bars.map(b => attr(b, 'x'))).toEqual([1, 1])
  expect(bars.map(b => attr(b, 'width'))).toEqual([99, 49.5])
  expect(bars.map(b => /fill="([^"]+)"/.exec(b)?.[1])).toEqual([
    '#1b9e77',
    '#d95f02',
  ])
})

test('a bar whose color value is hidden draws nothing', async () => {
  const { svg } = await exportWith(
    [
      {
        kind: 'bar',
        encoding: { x: { field: 'size' }, color: { field: 'host' } },
      },
    ],
    [{ field: 'host', value: 'poultry' }],
  )
  const bars = group(svg, 'rowpanel-0').match(/<rect[^>]*>/g) ?? []
  expect(bars).toHaveLength(1)
})

test('the axis draws in the header band, under the header as its title', async () => {
  const { model, svg } = await exportWith([
    {
      kind: 'bar',
      encoding: { x: { field: 'size' } },
      header: 'genome',
    },
  ])
  const axis = group(svg, 'rowpanel-axis-0')
  const labels = [...axis.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(
    m => m[1],
  )
  expect(labels).toEqual(['0', '2M', '4M'])
  const title = /<text([^>]*)>genome<\/text>/.exec(svg)
  expect(title, 'the title is clipped or missing').toBeTruthy()
  const attrs = title?.[1] ?? ''
  expect(attrs).not.toContain('rotate')
  const band = model.rowPanelsHeaderHeight
  expect(attr(attrs, 'y')).toBeLessThan(band - 16)
  expect(svg).toMatch(
    new RegExp(
      `transform="translate\\(${model.effectiveTreeAreaWidth} ${band - 18}\\)"><g id="rowpanel-axis-0">`,
    ),
  )
})

test('a dot per row at its value', async () => {
  const { svg } = await exportWith([
    { kind: 'point', encoding: { x: { field: 'size' } }, size: 6 },
  ])
  const dots = group(svg, 'rowpanel-0').match(/<path[^>]*>/g) ?? []
  expect(dots).toHaveLength(2)
})

test('a text panel prints its field, with no axis', async () => {
  const { svg } = await exportWith([
    { kind: 'text', encoding: { text: { field: 'clade' } } },
  ])
  const texts = [
    ...group(svg, 'rowpanel-0').matchAll(/<text[^>]*>([^<]*)<\/text>/g),
  ].map(m => m[1])
  expect(texts).toEqual(['2.3.4.4b', '2.3.2.1a'])
  expect(svg).not.toContain('rowpanel-axis-0')
})

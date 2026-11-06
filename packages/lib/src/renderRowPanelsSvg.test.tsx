// @vitest-environment jsdom
//
// The `rowPanels` strips: one colored cell per row between the tree and the
// alignment, with a rotated header over each column.
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

const tree = '((duck:0.1,chicken:0.1):0.2,goose:0.3);'

const rowData = {
  duck: { HA: 'H5', NA: 'N1' },
  chicken: { HA: 'H5', NA: 'N8' },
  goose: { HA: 'H7', NA: 'N1' },
}

const panels: RowPanelSpec[] = [
  {
    kind: 'strip',
    encoding: {
      fill: {
        field: 'HA',
        domain: ['H5', 'H7'],
        range: ['#e41a1c', '#377eb8'],
      },
    },
    width: 12,
  },
  {
    kind: 'strip',
    encoding: { fill: { field: 'NA' } },
    header: 'NA segment',
    width: 12,
  },
]

async function exportWith(rowPanels: RowPanelSpec[]) {
  installSvgTestEnv()
  const model = createTestModel({
    id: 'rowpanels-svg-test',
    data: { msa, tree, treeMetadata: JSON.stringify(rowData) },
    rowPanels,
  })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

const rects = (svg: string) => svg.match(/<rect[^>]*>/g) ?? []

const panelGroup = (svg: string, i: number) =>
  new RegExp(
    `<clipPath id="rowpanel-rowpanels-svg-test-${i}"><rect x="0" y="0" width="(\\d+)"[^>]*></rect></clipPath></defs><g clip-path="[^"]+" transform="translate\\(([\\d.]+) 0\\)"><g id="rowpanel-${i}">([\\s\\S]*?)</g></g>`,
  ).exec(svg)

test('the strips draw a cell per row in the scale colors', async () => {
  const { model, svg } = await exportWith(panels)
  const { rowHeight } = model

  const groups = [0, 1].map(i => panelGroup(svg, i))
  expect(groups.every(Boolean), 'a strip has no group of its own').toBe(true)

  // duck and chicken are H5, goose H7, and every cell is the strip's width
  const cells = groups.flatMap(g =>
    rects(g![3]!).map(r => ({
      fill: /fill="([^"]+)"/.exec(r)?.[1],
      x: /x="([^"]+)"/.exec(r)?.[1],
      y: /y="([^"]+)"/.exec(r)?.[1],
      width: /width="([^"]+)"/.exec(r)?.[1],
    })),
  )
  expect(cells.filter(c => c.fill === '#e41a1c')).toHaveLength(2)
  expect(cells.filter(c => c.fill === '#377eb8')).toHaveLength(1)
  expect(cells.every(c => c.width === '12' && c.x === '0')).toBe(true)
  expect(cells.map(c => c.y)).toContain(`${2 * rowHeight}`)

  // each strip is clipped to its own width, and the second sits one width to
  // the right of the first
  expect(groups.map(g => Number(g![1]))).toEqual([12, 12])
  expect(groups.map(g => Number(g![2]))).toEqual([
    model.effectiveTreeAreaWidth,
    model.effectiveTreeAreaWidth + 12,
  ])
})

test('each header draws over its column, turned on its side', async () => {
  const { model, svg } = await exportWith(panels)
  const { effectiveTreeAreaWidth } = model
  const headers = [
    ...svg.matchAll(/<text([^>]*rotate\(-90[^>]*)>([^<]*)<\/text>/g),
  ].map(m => ({ attrs: m[1]!, text: m[2]! }))

  // the band is 56px, so a name longer than it is clipped to it
  expect(headers.map(h => h.text)).toEqual(['HA', 'NA se…'])
  const x = (attrs: string) => Number(/x="([^"]+)"/.exec(attrs)?.[1])
  expect(x(headers[1]!.attrs) - x(headers[0]!.attrs)).toBe(12)
  expect(x(headers[0]!.attrs)).toBeGreaterThan(effectiveTreeAreaWidth)
})

test('a panel wider than the header band writes its header across', async () => {
  const { svg } = await exportWith([
    {
      kind: 'strip',
      encoding: { fill: { field: 'NA' } },
      header: 'neighborhood',
      width: 200,
    },
  ])
  const header = /<text([^>]*)>neighborhood<\/text>/.exec(svg)
  expect(header, 'header clipped or missing').toBeTruthy()
  expect(header![1]).not.toContain('rotate')
  expect(header![1]).toContain('text-anchor="middle"')
})

test('the alignment moves right by the strips, and the page grows with them', async () => {
  const bare = await exportWith([])
  const striped = await exportWith(panels)

  const msaTransform = (svg: string) =>
    /<g clip-path="url\(#msa-rowpanels-svg-test\)" transform="translate\((\d+) 0\)">/.exec(
      svg,
    )?.[1]
  expect(Number(msaTransform(striped.svg))).toBe(
    Number(msaTransform(bare.svg)) + 24,
  )

  // the legend column starts at the end of the content, which is the tree, the
  // strips and the alignment; the bare export has no legend and no strips, so
  // its page is that content alone
  const contentWidth = Number(
    /<g id="legend-panel" transform="translate\((\d+) /.exec(striped.svg)?.[1],
  )
  const bareWidth = Number(/<svg width="(\d+)"/.exec(bare.svg)?.[1])
  expect(contentWidth).toBe(bareWidth + 24)

  // the headers take a band across the top, and the panels start under it
  expect(striped.svg).toContain(
    `<g transform="translate(0 ${striped.model.rowPanelsHeaderHeight})">`,
  )
})

test('no row panels leaves the export as it was', async () => {
  const { svg } = await exportWith([])
  expect(svg).not.toContain('rowpanel-0')
  expect(svg).not.toContain('rowpanel-headers')
})

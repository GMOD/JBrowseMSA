// @vitest-environment jsdom
//
// A `features` row panel in the export: one arrow per gene, at the x the
// `align` transform puts it, in the colors and with the labels its encoding
// names.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { RowPanelSpec } from './types.ts'

const tree = '((g1:0.1,g2:0.1):0.2,g3:0.3);'

const gff = `##gff-version 3
g1\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA;class=core
g1\tncbi\tgene\t600\t1000\t.\t+\t.\tName=genE;class=core
g2\tncbi\tgene\t200\t700\t.\t+\t.\tName=genE;class=core
g3\tncbi\tgene\t1\t400\t.\t-\t.\tName=genA;class=accessory`

const panels: RowPanelSpec[] = [
  {
    kind: 'features',
    x: 'position',
    width: 216,
    header: 'neighborhood',
    encoding: {
      color: {
        field: 'class',
        scale: { map: { core: '#e41a1c', accessory: '#377eb8' } },
      },
      label: 'Name',
    },
    transform: [{ type: 'align', on: 'genE' }],
  },
]

async function exportWith(rowPanels: RowPanelSpec[], msa?: string) {
  installSvgTestEnv()
  const model = createTestModel({
    id: 'features-svg-test',
    data: { tree, gff, ...(msa ? { msa } : {}) },
    rowPanels,
  })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

const panelGroup = (svg: string) =>
  /<g id="rowpanels-panel">([\s\S]*?)<\/g><\/g>/.exec(svg)?.[1] ?? ''

// the x of each point of an arrow's path
const pathXs = (path: string) =>
  [...path.matchAll(/[ML] (-?[\d.]+) /g)].map(m => Number(m[1]))

test('each gene draws as an arrow in its scale color', async () => {
  const { svg } = await exportWith(panels)
  const paths = [...panelGroup(svg).matchAll(/<path[^>]*>/g)].map(m => m[0])
  expect(paths).toHaveLength(4)

  const fills = paths.map(p => /fill="([^"]+)"/.exec(p)?.[1])
  expect(fills.filter(f => f === '#e41a1c')).toHaveLength(3)
  expect(fills.filter(f => f === '#377eb8')).toHaveLength(1)

  // the head is the third point of the path: past the right end of a + strand
  // gene, past the left end of a - strand one
  const plus = pathXs(paths[0]!)
  const minus = pathXs(paths[3]!)
  expect(plus[2]).toBe(Math.max(...plus))
  expect(minus[2]).toBe(Math.min(...minus))
})

test('align lines the named gene up across the rows', async () => {
  const { svg } = await exportWith(panels)
  const starts = [...panelGroup(svg).matchAll(/<path[^>]*>/g)].map(
    m => pathXs(m[0])[0]!,
  )
  // g1's genE and g2's genE both start at the aligned x; g1's genA is left of
  // it and g3's genA keeps its own origin
  const genE = starts[1]!
  expect(starts[2]).toBeCloseTo(genE)
  expect(starts[0]).toBeLessThan(genE)
})

test('the label rides inside the span it names', async () => {
  const { svg } = await exportWith(panels)
  const labels = [...panelGroup(svg).matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
  expect(labels.map(m => m[1])).toEqual(['genA', 'genE', 'genE', 'genA'])
})

test('a tree and a GFF with no alignment export the panel and no columns', async () => {
  const { model, svg } = await exportWith(panels)
  expect(model.numColumns).toBe(0)
  expect(svg).toContain('<g id="rowpanels-panel">')
  // the alignment panel is there and empty, and the page is the tree, the
  // panel and the legend column
  expect(svg).toContain('<g id="msa-panel">')
  expect(panelGroup(svg)).toContain('<path')
  expect(Number(/<svg width="(\d+)"/.exec(svg)?.[1])).toBe(
    model.treeAreaWidth + model.rowPanelsWidth + 120,
  )
  // the header band clips a name longer than its height, as it does a strip's
  expect(svg).toContain('<g id="rowpanel-headers">')
  expect(svg).toContain('>neig…<')
})

test('an alignment beside the panel keeps both', async () => {
  const msa = '>g1\nMKAANSE\n>g2\nMKA-NSE\n>g3\nMKAANSE'
  const { model, svg } = await exportWith(panels, msa)
  expect(model.numColumns).toBe(7)
  expect(panelGroup(svg).match(/<path/g)).toHaveLength(4)
  expect(svg).toContain(
    `transform="translate(${model.treeAreaWidth + model.rowPanelsWidth} 0)"`,
  )
})

// @vitest-environment jsdom
//
// The SVG export draws the selected block as a bordered band over the rows and
// columns it covers.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

import type { MsaSelection } from './types.ts'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

const msa = `>seq1
ACDEFGHIKL
>seq2
AC--FGHIKL
>seq3
ACDEFGHIKL
>seq4
ACDEFGHIKL`

async function exportWith(selection?: MsaSelection) {
  const model = MSAModelF().create({
    id: 'block-svg-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa },
    selection,
  })
  model.setWidth(800)
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

const bands = (svg: string) =>
  (svg.match(/<rect[^>]*>/g) ?? []).filter(r => r.includes('rgb(25,118,210)'))
const fills = (svg: string) =>
  bands(svg).filter(r => r.includes('fill="rgb(25,118,210)"'))

test('the selected block exports as a band over its cells', async () => {
  const { model, svg } = await exportWith({
    start: 3,
    end: 5,
    rows: ['seq2', 'seq3'],
  })
  const { colWidth, rowHeight } = model
  const geometry = [
    `x="${2 * colWidth}"`,
    `y="${rowHeight}"`,
    `width="${3 * colWidth}"`,
    `height="${2 * rowHeight}"`,
  ]
  const [fill, border] = bands(svg)
  for (const attribute of geometry) {
    expect(fill).toContain(attribute)
    expect(border).toContain(attribute)
  }
  expect(border).toContain('stroke="rgb(25,118,210)"')
})

test('rows apart in the display export as one band each', async () => {
  const { model, svg } = await exportWith({
    start: 1,
    end: 2,
    rows: ['seq1', 'seq4'],
  })
  const ys = fills(svg).map(r => /y="([^"]+)"/.exec(r)?.[1])
  expect(ys).toEqual(['0', `${3 * model.rowHeight}`])
})

test('no selection exports no band', async () => {
  const { svg } = await exportWith()
  expect(bands(svg)).toEqual([])
})

// @vitest-environment jsdom
//
// The SVG export draws the `highlights` layer: a bordered band with its label
// over the alignment, a residue span at the column the row's gaps put it in,
// and a row set tinted across both the tree and the alignment.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

import type { Highlight } from './types.ts'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

const msa = `>seq1
ACDEFGHIKL
>seq2
AC--FGHIKL
>seq3
ACDEFGHIKL`

async function exportWith(highlights: Highlight[]) {
  const model = MSAModelF().create({
    id: 'highlight-svg-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa },
    highlights,
  })
  model.setWidth(800)
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

const rects = (svg: string) => svg.match(/<rect[^>]*>/g) ?? []

test('a labeled column span draws a band and its label', async () => {
  const { model, svg } = await exportWith([
    { start: 3, end: 5, label: 'motif', color: 'rgb(1, 2, 3)' },
  ])
  const { colWidth, totalHeight } = model
  const band = rects(svg).find(
    r => r.includes(`x="${2 * colWidth}"`) && r.includes('rgb(1, 2, 3)'),
  )
  expect(band).toBeDefined()
  expect(band).toContain(`width="${3 * colWidth}"`)
  expect(band).toContain(`height="${totalHeight}"`)
  expect(svg).toContain('>motif<')
})

test('a residue span lands where the row has its residues', async () => {
  const { model, svg } = await exportWith([
    { row: 'seq2', start: 3, end: 3, color: 'rgb(9, 9, 9)' },
  ])
  expect(model.resolvedHighlights[0]).toMatchObject({
    startCol: 4,
    endCol: 4,
  })
  const band = rects(svg).find(r => r.includes('rgb(9, 9, 9)'))
  expect(band).toContain(`x="${4 * model.colWidth}"`)
})

test('a row set tints the row in the tree and the alignment', async () => {
  const { model, svg } = await exportWith([
    { rows: ['seq3'], label: 'odd one out', color: 'rgb(7, 7, 7)' },
  ])
  const { rowHeight, treeAreaWidth, totalWidth } = model
  const tints = rects(svg).filter(
    r => r.includes('rgb(7, 7, 7)') && r.includes(`y="${2 * rowHeight}"`),
  )
  expect(tints.map(r => /width="([^"]+)"/.exec(r)?.[1])).toEqual(
    expect.arrayContaining([`${treeAreaWidth}`, `${totalWidth}`]),
  )
  expect(svg).toContain('>odd one out<')
})

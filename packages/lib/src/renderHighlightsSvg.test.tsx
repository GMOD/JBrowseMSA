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

async function exportWith(
  highlights: Highlight[],
  extra: { highlightColumns?: number[]; relativeTo?: string } = {},
) {
  const model = MSAModelF().create({
    id: 'highlight-svg-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa },
    highlights,
    ...extra,
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

test('highlighted columns and the reference row export as they draw', async () => {
  const { model, svg } = await exportWith([], {
    highlightColumns: [1, 2],
    relativeTo: 'seq2',
  })
  const { colWidth, rowHeight, totalWidth, totalHeight } = model

  const band = rects(svg).find(r => r.includes('rgb(255,140,0)'))
  expect(band).toContain(`x="${colWidth}"`)
  expect(band).toContain(`width="${2 * colWidth}"`)
  expect(band).toContain(`height="${totalHeight}"`)

  const referenceTint = rects(svg).find(
    r => r.includes('rgb(0,128,255)') && r.includes(`width="${totalWidth}"`),
  )
  expect(referenceTint).toContain(`y="${rowHeight}"`)
  expect(referenceTint).toContain(`height="${rowHeight}"`)
})

test('a band across every column keeps the letters under it', async () => {
  const { model, svg } = await exportWith([{ start: 1, end: 10 }])
  expect(model.showMsaLetters).toBe(true)
  // the band covers the alignment exactly, which svgcanvas used to read as a
  // request to clear the drawing
  expect((svg.match(/<text/g) ?? []).length).toBeGreaterThan(20)
})

// label boxes, as `x|y` of the text inside them
function labels(svg: string) {
  return [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map(m => ({
    text: m[2]!,
    x: Number(/x="([\d.-]+)"/.exec(m[1]!)?.[1]),
    y: Number(/y="([\d.-]+)"/.exec(m[1]!)?.[1]),
  }))
}

test('two labels a column apart do not overdraw each other', async () => {
  const { svg } = await exportWith([
    { start: 4, end: 4, label: 'p248' },
    { start: 5, end: 5, label: 'p249' },
  ])
  const drawn = labels(svg)
  const first = drawn.find(l => l.text === 'p248')!
  const second = drawn.find(l => l.text === 'p249')!

  expect(first).toBeDefined()
  expect(second).toBeDefined()
  // both labels are wider than the single column they title, so the second one
  // steps down a row rather than landing on top of the first
  expect(second.y).toBeGreaterThanOrEqual(first.y + 17)
})

test('a band scrolled off the left keeps its label in frame', async () => {
  const model = MSAModelF().create({
    id: 'highlight-scroll-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa: `>seq1\n${'ACDEFGHIKL'.repeat(30)}` },
    highlights: [{ start: 1, end: 200, label: 'kinase domain' }],
  })
  model.setWidth(1000)
  model.doScrollX(-1000)
  expect(model.scrollX).toBe(-1000)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
  })
  // the alignment layer sits at its own origin, so an x inside it is on screen
  // -- the band starts 1000px to the left of it
  const label = labels(svg).find(l => l.text === 'kinase domain')!
  expect(label).toBeDefined()
  expect(label.x).toBeGreaterThanOrEqual(0)
  expect(label.x).toBeLessThan(model.msaCanvasWidth)
})

// @vitest-environment jsdom
//
// The SVG export draws the `clades` layer in both panels: a rectangle from the
// clade's common ancestor to the edge of the tree area, and a band of the same
// color across the alignment.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { Clade } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const msa = `>A
ACDEFGHIKL
>B
ACDEFGHIKL
>C
ACDEFGHIKL
>D
ACDEFGHIKL`

const tree = '((A:0.1,B:0.1):0.2,(C:0.1,D:0.1):0.2);'

async function exportWith(clades: Clade[], rowHeight?: number) {
  const model = createTestModel({ data: { msa, tree }, clades })
  if (rowHeight !== undefined) {
    model.setRowHeight(rowHeight)
  }
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

// the bar is the one stroked path the bracket color draws
function bar(svg: string, color: string) {
  const path = new RegExp(
    `<path[^>]*stroke="${color.replaceAll(/[()]/g, '\\$&')}"[^>]*d=" M ([\\d.]+) ([\\d.]+) L [\\d.]+ ([\\d.]+)"[^>]*>`,
  ).exec(svg)
  return path
    ? {
        x: Number(path[1]),
        top: Number(path[2]),
        bottom: Number(path[3]),
      }
    : undefined
}

function labels(svg: string) {
  const group = /<g id="clade-labels">(.*?)<\/g>/.exec(svg)?.[1] ?? ''
  return [...group.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map(m => ({
    attrs: m[1]!,
    text: m[2]!,
  }))
}

// svgcanvas writes a translucent fill as an opaque color plus an opacity
function rects(svg: string, fill: string, opacity = '0.6') {
  return (svg.match(/<rect[^>]*>/g) ?? [])
    .filter(
      r =>
        r.includes(`fill="${fill}"`) && r.includes(`fill-opacity="${opacity}"`),
    )
    .map(r => ({
      x: Number(/ x="([\d.-]+)"/.exec(r)?.[1]),
      y: Number(/ y="([\d.-]+)"/.exec(r)?.[1]),
      width: Number(/ width="([\d.-]+)"/.exec(r)?.[1]),
      height: Number(/ height="([\d.-]+)"/.exec(r)?.[1]),
    }))
}

test('a clade draws in the tree panel and across the alignment', async () => {
  const { model, svg } = await exportWith([
    { mrca: ['C', 'D'], tips: 2, mark: 'highlight', color: 'rgb(1, 2, 3)' },
  ])
  const { rowHeight, treeAreaWidth, totalWidth } = model
  expect(model.resolvedClades[0]!.rows).toEqual([2, 3])

  const drawn = rects(svg, 'rgb(1,2,3)')
  expect(drawn).toHaveLength(2)
  for (const rect of drawn) {
    expect(rect.y).toBe(2 * rowHeight)
    expect(rect.height).toBe(2 * rowHeight)
  }

  const band = drawn.find(r => r.width === totalWidth)!
  expect(band.x).toBe(0)

  // the tree rectangle starts at the clade's ancestor, inside the tree area,
  // and runs to its right edge
  const rectangle = drawn.find(r => r !== band)!
  expect(rectangle.x).toBeGreaterThan(0)
  expect(rectangle.x + rectangle.width).toBe(treeAreaWidth)
})

test('a clade over the whole tree draws under the branches', async () => {
  const { svg } = await exportWith([
    { mrca: ['A', 'D'], tips: 4, mark: 'highlight' },
  ])
  const drawn = rects(svg, 'rgb(255,243,196)')
  expect(drawn).toHaveLength(2)
  expect(drawn.every(r => r.y === 0)).toBe(true)
  expect(svg).toContain('<path')
})

test('a bracket draws its bar in the gutter with the label beside it', async () => {
  const { model, svg } = await exportWith([
    {
      mrca: ['C', 'D'],
      tips: 2,
      mark: 'bracket',
      color: 'rgb(1, 2, 3)',
      label: 'clade II',
    },
  ])
  const { rowHeight, treeAreaWidth, cladeGutterWidth } = model
  expect(cladeGutterWidth).toBeGreaterThan(0)

  const drawn = bar(svg, 'rgb(1, 2, 3)')!
  expect(drawn.x).toBeGreaterThan(treeAreaWidth - cladeGutterWidth)
  expect(drawn.x).toBeLessThan(treeAreaWidth)
  expect(drawn.top).toBeGreaterThanOrEqual(2 * rowHeight)
  expect(drawn.bottom).toBeLessThanOrEqual(4 * rowHeight)

  const [label] = labels(svg)
  expect(label!.text).toBe('clade II')
  expect(label!.attrs).not.toContain('rotate')
  expect(label!.attrs).toContain('fill="rgb(1, 2, 3)"')
  expect(Number(/ x="([\d.]+)"/.exec(label!.attrs)?.[1])).toBeGreaterThan(
    drawn.x,
  )
})

test('a clade shorter than the font turns its label on its side', async () => {
  const short = await exportWith(
    [{ mrca: ['A'], tips: 1, mark: 'bracket', label: 'one tip' }],
    4,
  )
  const tall = await exportWith([
    { mrca: ['A'], tips: 1, mark: 'bracket', label: 'one tip' },
  ])
  expect(labels(short.svg)[0]!.attrs).toContain('rotate(-90')
  expect(labels(tall.svg)[0]!.attrs).not.toContain('rotate')
})

test('a highlight carrying a label draws the label and no bar', async () => {
  const { svg } = await exportWith([
    {
      mrca: ['C', 'D'],
      tips: 2,
      mark: 'highlight',
      color: 'rgb(1, 2, 3)',
      label: 'clade II',
    },
  ])
  expect(labels(svg)[0]!.text).toBe('clade II')
  expect(bar(svg, 'rgb(1, 2, 3)')).toBeUndefined()
})

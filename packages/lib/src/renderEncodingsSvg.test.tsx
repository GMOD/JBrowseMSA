// @vitest-environment jsdom
//
// The two channels the viewer's own marks carry: `tipLabel` colors each tip
// label in the tree, and `rowTint` washes the row across the tree gutter and
// the alignment. Both read a field of the row table, and both export.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { Encoding } from './types.ts'

const msa = `>human
ACDEFGHIKL
>mouse
ACDEFGHIKL
>chicken
ACDEFGHIKL`

const tree = '((human:0.1,mouse:0.1):0.2,chicken:0.3);'

const rowData = {
  human: { clade: 'mammal' },
  mouse: { clade: 'mammal' },
  chicken: { clade: 'bird' },
}

async function exportWith(encodings: Encoding[]) {
  installSvgTestEnv()
  const model = createTestModel({
    id: 'encodings-svg-test',
    data: { msa, tree, treeMetadata: JSON.stringify(rowData) },
    encodings,
  })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

const texts = (svg: string) =>
  [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map(m => ({
    text: m[2]!,
    fill: /fill="([^"]+)"/.exec(m[1]!)?.[1],
  }))

const rects = (svg: string) => svg.match(/<rect[^>]*>/g) ?? []

test('a tipLabel encoding colors each label by its field', async () => {
  const { model, svg } = await exportWith([
    { channel: 'tipLabel', field: 'clade' },
  ])
  const scale = model.resolvedEncodings[0]!
  expect(scale.legend).toEqual([
    { label: 'bird', color: '#F8766D' },
    { label: 'mammal', color: '#00BFC4' },
  ])

  const drawn = texts(svg)
  const chicken = drawn.find(t => t.text === 'chicken')
  const human = drawn.find(t => t.text === 'human')
  expect(chicken?.fill).toBe('#F8766D')
  expect(human?.fill).toBe('#00BFC4')
})

test('a rowTint encoding washes the row in the tree and the alignment', async () => {
  const { model, svg } = await exportWith([
    {
      channel: 'rowTint',
      field: 'clade',
      scale: { map: { bird: '#0000ff' } },
    },
  ])
  const { rowHeight, treeAreaWidth, totalWidth } = model
  expect(model.rowTints).toEqual([
    undefined,
    undefined,
    'rgba(0, 0, 255, 0.25)',
  ])

  // chicken is the last row of the tree, and takes the wash in both panels at
  // the alpha a tint draws at
  const washes = rects(svg).filter(
    r =>
      r.includes('fill="rgb(0,0,255)"') &&
      r.includes('fill-opacity="0.25"') &&
      r.includes(`y="${2 * rowHeight}"`),
  )
  expect(washes.map(r => /width="([^"]+)"/.exec(r)?.[1])).toEqual(
    expect.arrayContaining([`${treeAreaWidth}`, `${totalWidth}`]),
  )
  expect(washes).toHaveLength(2)
})

test('a row with no value for the field takes no tint', async () => {
  const { svg } = await exportWith([
    { channel: 'rowTint', field: 'missing-field' },
  ])
  expect(rects(svg).filter(r => r.includes('fill-opacity="0.25"'))).toEqual([])
})

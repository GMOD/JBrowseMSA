// @vitest-environment jsdom
//
// A customColorScheme map in the SVG export: the letters it lists take its
// color in either channel, and every other letter stays uncolored.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'
import { adjustColorForContrast } from './util.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const theme = createJBrowseTheme()
const blue = '#1f77b4'

function exportEntire(model: ReturnType<typeof createTestModel>) {
  return renderToSvg(model, { theme, exportType: 'entire' })
}

// the fill of each alignment cell, in the per-cell fallback jsdom takes
function cellFills(svg: string, colWidth: number) {
  return [...svg.matchAll(/<rect([^>]*)>/g)]
    .map(m => m[1]!)
    .filter(attrs => attrs.includes(`width="${colWidth}"`))
    .map(attrs => /fill="([^"]+)"/.exec(attrs)?.[1])
}

function letterFills(svg: string) {
  const out = new Map<string, Set<string>>()
  for (const m of svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)) {
    const fill = /fill="([^"]+)"/.exec(m[1]!)?.[1] ?? ''
    const opacity = /fill-opacity="([^"]+)"/.exec(m[1]!)?.[1] ?? ''
    out.set(m[2]!, (out.get(m[2]!) ?? new Set()).add(`${fill}|${opacity}`))
  }
  return out
}

test('a mapped letter fills its cell, and an unlisted one keeps the background', async () => {
  const model = createTestModel({
    id: 'letter-map-fill',
    // a map over a dynamic scheme name draws as the map
    colorSchemeName: 'clustalx_protein_dynamic',
    customColorScheme: { k: blue },
    data: { msa: '>s1\nKAK\n>s2\nKAR\n' },
  })
  const background = theme.palette.background.default

  expect(cellFills(await exportEntire(model), model.colWidth)).toEqual([
    blue,
    background,
    blue,
    blue,
    background,
    background,
  ])
})

test('under the color channel a mapped letter takes the color, and an unlisted one the text color', async () => {
  const model = createTestModel({
    id: 'letter-map-color',
    bgColor: false,
    customColorScheme: { K: blue },
    data: { msa: '>s1\nKAK\n>s2\nKAR\n' },
  })
  const letters = letterFills(await exportEntire(model))

  expect([...letters.get('K')!]).toEqual([
    `${adjustColorForContrast(blue, theme.palette.background.default)}|`,
  ])
  expect([...letters.get('A')!]).toEqual(['rgb(0,0,0)|0.87'])
  expect([...letters.get('R')!]).toEqual(['rgb(0,0,0)|0.87'])
})

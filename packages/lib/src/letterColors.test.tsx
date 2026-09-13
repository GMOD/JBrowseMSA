// @vitest-environment jsdom
//
// What color a letter is drawn in, checked through the SVG export because it is
// the one path that records the choice rather than painting it.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { ColumnTrackSpec } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const light = createJBrowseTheme()
const dark = createJBrowseTheme({ palette: { mode: 'dark' } })

// letter -> the fills the export drew it in, as `color|opacity` because
// svgcanvas splits an rgba() into a color and a fill-opacity
function letterFills(svg: string) {
  const out = new Map<string, Set<string>>()
  for (const m of svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)) {
    const attrs = m[1]!
    const fill = /fill="([^"]+)"/.exec(attrs)?.[1] ?? ''
    const opacity = /fill-opacity="([^"]+)"/.exec(attrs)?.[1] ?? ''
    out.set(m[2]!, (out.get(m[2]!) ?? new Set()).add(`${fill}|${opacity}`))
  }
  return out
}

// the same color as the export writes it
function asFill(color: string) {
  const rgba = /rgba\((\d+), ?(\d+), ?(\d+), ?([\d.]+)\)/.exec(color)
  return rgba ? `rgb(${rgba[1]},${rgba[2]},${rgba[3]})|${rgba[4]}` : `${color}|`
}

async function exportEntire(
  model: ReturnType<typeof createTestModel>,
  theme = light,
) {
  return renderToSvg(model, {
    theme,
    exportType: 'entire',
    includeTracks: true,
  })
}

test('a dark theme draws uncolored letters in its own text color', async () => {
  const model = createTestModel({
    id: 'dark-letters',
    colorSchemeName: 'maeditor',
    // B and Z have no maeditor color, and neither does a gap
    data: { msa: '>s1\nBZ-A\n>s2\nBZ-A\n' },
  })
  const fills = letterFills(await exportEntire(model, dark))

  const uncolored = [...(fills.get('B') ?? []), ...(fills.get('Z') ?? [])]
  expect(uncolored.length).toBeGreaterThan(0)
  for (const fill of uncolored) {
    expect(fill).not.toBe('black|')
    expect(fill).toBe(asFill(dark.palette.text.primary))
  }
  // a colored cell still takes the contrast color of the cell, not the theme's:
  // maeditor paints A light green, which wants dark letters in either theme
  expect([...fills.get('A')!]).toEqual(['rgb(0,0,0)|0.87'])
})

test('a reference match draws its dot in the theme text color', async () => {
  const model = createTestModel({
    id: 'reference-dots',
    colorSchemeName: 'maeditor',
    data: { msa: '>s1\nAAAA\n>s2\nAAAA\n' },
  })
  model.drawRelativeTo('s2')

  const fills = letterFills(await exportEntire(model))
  // the dots sit on the faint reference-match wash, not on a colored tile: the
  // letter's own contrast color is white there, which is invisible
  expect([...fills.get('.')!]).toEqual([asFill(light.palette.text.primary)])
})

test('a text track letter contrasts against its own color, not the alignment scheme', async () => {
  const columnTracks: ColumnTrackSpec[] = [
    {
      id: 'frame',
      name: 'Codon frame',
      kind: 'text',
      data: '1122',
      colors: { 1: '#000080', 2: '#ffff00' },
    },
  ]
  const model = createTestModel({
    id: 'text-track-letters',
    data: { msa: '>s1\nACGT\n' },
    columnTracks,
  })
  const svg = await exportEntire(model)
  const fills = letterFills(svg)

  expect([...fills.get('1')!]).toEqual(['#fff|'])
  expect([...fills.get('2')!]).toEqual([asFill(light.palette.text.primary)])
  // centered in the row rather than sat on a baseline near its top, which
  // clipped the tops of the glyphs
  const glyph = /<text[^>]*>1<\/text>/.exec(svg)![0]
  expect(glyph).toContain('dominant-baseline="central"')
  expect(glyph).toContain(`y="${model.rowHeight / 2}"`)
})

// @vitest-environment jsdom
//
// Layout and palette of the exported figure itself, as opposed to what any one
// layer draws inside it.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import {
  createTestModel,
  installSvgTestEnv,
  syntheticProteinMsa,
} from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

function makeModel({ rows = 60, cols = 400 } = {}) {
  return createTestModel({ data: { msa: syntheticProteinMsa(rows, cols) } })
}

const rootRect = (svg: string) => /<rect[^>]*height="100%"[^>]*>/.exec(svg)?.[0]

test('the page takes the theme background, not a hardcoded white', async () => {
  const model = makeModel()
  const dark = createJBrowseTheme({ palette: { mode: 'dark' } })
  expect(dark.palette.background.default).not.toBe('white')

  const svg = await renderToSvg(model, { theme: dark, exportType: 'entire' })

  // the layers below draw in theme colors: text.primary is near-white in a dark
  // theme, so a white page would export white on white
  expect(rootRect(svg)).toContain(`fill="${dark.palette.background.default}"`)
})

test('a viewport export is the alignment canvas, not the whole widget', async () => {
  const model = makeModel()
  expect(model.showHorizontalScrollbar).toBe(true)
  expect(model.showVerticalScrollbar).toBe(true)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
  })

  // the widget box also covers the resize handle and the scrollbars; exporting
  // it drew the rows and columns those hide
  const { treeAreaWidth, msaCanvasWidth, msaAreaHeight, minimapHeight } = model
  expect(svg).toContain(`width="${treeAreaWidth + msaCanvasWidth}"`)
  expect(svg).toContain(`height="${msaAreaHeight + minimapHeight}"`)
  expect(msaAreaHeight + minimapHeight).toBe(model.height)
})

test('no attribute is serialized as the string "undefined"', async () => {
  const model = makeModel({ rows: 4, cols: 20 })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })

  expect(svg).toContain('<text')
  expect(svg).not.toContain('="undefined"')
})

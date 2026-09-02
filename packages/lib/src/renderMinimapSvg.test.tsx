// @vitest-environment jsdom
//
// The viewport export draws a minimap by default, and nothing covered it. It
// spans the same alignment canvas the live minimap does, so its trapezoid has
// to reach the right edge of the exported alignment column -- and it is drawn
// only when the live view shows one at all.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const width = 1000

function makeModel(cols = 400) {
  const row = 'ACDEFGHIKL'.repeat(cols / 10)
  return createTestModel(
    { height: 300, data: { msa: `>seq1\n${row}\n>seq2\n${row}` } },
    width,
  )
}

function exportViewport(model: ReturnType<typeof makeModel>) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
    includeTracks: false,
  })
}

test('the exported minimap spans the exported alignment column', async () => {
  const model = makeModel()
  expect(model.showHorizontalScrollbar).toBe(true)

  const svg = await exportViewport(model)

  // the minimap column is the alignment canvas, which is what the export lays
  // out beside the tree
  const minimapWidth = model.msaCanvasWidth
  const polygon = /<polygon[^>]*points="([^"]*)"/.exec(svg)?.[1]
  expect(polygon).toBeDefined()
  // bottom edge of the trapezoid reaches the full width it was given
  expect(polygon!.endsWith(`${minimapWidth},${model.minimapHeight - 12}`)).toBe(
    true,
  )
  // and the bar outline is drawn to the same width
  expect(svg).toContain(`width="${minimapWidth}"`)
})

test('no minimap when the alignment already fits across', async () => {
  const model = makeModel(10)
  expect(model.showHorizontalScrollbar).toBe(false)

  // a minimap here would mark a viewport wider than the bar it sits in, and the
  // live view draws none either
  expect(await exportViewport(model)).not.toContain('<polygon')
})

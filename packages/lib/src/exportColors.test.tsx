// @vitest-environment jsdom
//
// SVG 1.1 presentation attributes take a <color>: no rgba(), no hsl(). An
// editor that cannot parse a fill drops the element, so the export has to hand
// over colors it can hold.
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

test('the minimap thumb keeps its alpha as fill-opacity', async () => {
  const model = createTestModel({
    id: 'export-colors-minimap',
    data: { msa: syntheticProteinMsa(4, 400) },
  })
  expect(model.showHorizontalScrollbar).toBe(true)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
  })

  // rgba(66,119,127,0.3): opaque before, which hid the alignment behind the bar
  expect(svg).toContain('fill="#42777f" fill-opacity="0.3"')
  expect(svg).not.toContain('rgba(')
})

test('percent identity colors export as hex, not hsl', async () => {
  const model = createTestModel({
    id: 'export-colors-identity',
    colorSchemeName: 'percent_identity_dynamic',
    data: { msa: '>s1\nACDE\n>s2\nACDE\n>s3\nACDE\n' },
  })
  expect(model.colConsensus[0]!.color).toContain('hsl(')

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })

  expect(svg).not.toContain('hsl(')
  expect(svg).toContain('fill="#9191c4"')
})

// @vitest-environment jsdom
//
// The SVG export draws the alignment marks where the canvas does: over the
// residue cells and under the letters.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

test('a row-tall mark exports over the residue cells and under the letters', async () => {
  const model = createTestModel({
    id: 'marks-svg-test',
    data: { msa: '>a\nACDEFGHIKL\n>b\nACDEFGHIKL' },
    features: [{ row: 'a', start: 3, end: 4, type: 'modified_base' }],
    marks: [
      {
        kind: 'features',
        height: { band: 1 },
        encoding: { fill: { value: '#0000ff' } },
      },
    ],
    residueColor: { field: 'residue' },
  })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
  const panel = svg.slice(svg.indexOf('id="msa-panel"'))
  const span = panel.indexOf('<rect fill="#0000ff" x="24" y="0" width="24"')
  expect(span).toBeGreaterThan(panel.indexOf('x="108" y="16"'))
  expect(span).toBeLessThan(panel.indexOf('<text'))
})

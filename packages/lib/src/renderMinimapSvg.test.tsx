// @vitest-environment jsdom
//
// The viewport export draws a minimap by default, and nothing covered it. The
// export lays the figure out on its own grid rather than the on-screen one, so
// the minimap has to be told how wide to draw -- reading a width off the model
// puts its trapezoid short of the alignment column beside it.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { installRenderTestEnv } from './renderTestEnv.ts'
import { renderToSvg } from './renderToSvg.tsx'

beforeAll(() => {
  enableStaticRendering(true)
  installRenderTestEnv()
})

const width = 1000

function makeModel() {
  const row = 'ACDEFGHIKL'.repeat(40)
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 300,
    data: { msa: `>seq1\n${row}\n>seq2\n${row}` },
  })
  model.setWidth(width)
  return model
}

test('the exported minimap spans the exported alignment column', async () => {
  const model = makeModel()
  expect(model.showHorizontalScrollbar).toBe(true)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
    includeTracks: false,
  })

  // the minimap column runs from the tree area to the right edge of the figure
  const minimapWidth = width - model.treeAreaWidth
  const polygon = /<polygon[^>]*points="([^"]*)"/.exec(svg)?.[1]
  expect(polygon).toBeDefined()
  // bottom edge of the trapezoid reaches the full width it was given
  expect(polygon!.endsWith(`${minimapWidth},${model.minimapHeight - 12}`)).toBe(
    true,
  )
  // and the bar outline is drawn to the same width
  expect(svg).toContain(`width="${minimapWidth}"`)
})

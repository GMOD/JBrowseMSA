// @vitest-environment jsdom
//
// The screen states the scale a phylogram's branch lengths are drawn to, so the
// export has to carry the same bar: without it the figure's horizontal distance
// means nothing to a reader.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { treeScaleBarHeight } from './constants.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const msa = '>A\nACDE\n>B\nACDE\n>C\nACDE\n>D\nACDE'
const tree = '((A:0.1,B:0.1):0.2,(C:0.1,D:0.1):0.2);'

function group(svg: string) {
  return /<g id="tree-scalebar">(.*?)<\/g>/s.exec(svg)?.[1]
}

async function exportWith(
  snapshot: Partial<Parameters<typeof createTestModel>[0]>,
) {
  const model = createTestModel({ data: { msa, tree }, ...snapshot })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  return { model, svg }
}

test('the figure carries the bar the screen states the scale with', async () => {
  const { model, svg } = await exportWith({})
  const bar = model.treeScaleBar!
  expect(bar).toBeDefined()

  const markup = group(svg)
  expect(markup).toContain(`>${bar.label}<`)
  expect(markup).toContain(`h${bar.px}`)
})

test('the bar sits under the overview and the band grows for it', async () => {
  const flat = await exportWith({})
  const withOverview = await exportWith({ showTreeOverview: true })

  const y = (svg: string) =>
    Number(/<path d="M[\d.]+ ([\d.]+)/.exec(group(svg)!)![1])
  expect(y(withOverview.svg) - y(flat.svg)).toBe(
    withOverview.model.overviewHeight,
  )

  const height = (svg: string) =>
    Number(/<svg width="\d+" height="(\d+)"/.exec(svg)![1])
  expect(height(withOverview.svg) - height(flat.svg)).toBe(
    withOverview.model.overviewHeight,
  )
  expect(height(flat.svg)).toBeGreaterThanOrEqual(treeScaleBarHeight)
})

test('a cladogram has no scale to state, so no bar', async () => {
  const { model, svg } = await exportWith({ showBranchLen: false })
  expect(model.treeScaleBar).toBeUndefined()
  expect(svg).not.toContain('tree-scalebar')
})

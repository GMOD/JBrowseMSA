// @vitest-environment jsdom
//
// The overview is part of the published figure, so the export draws it as its
// own group above the tree panel: the same renderTreeOverview the live canvas
// runs, onto a svgcanvas Context.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { Clade } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const msa = '>A\nACDE\n>B\nACDE\n>C\nACDE\n>D\nACDE'
const tree = '((A:0.1,B:0.1):0.2,(C:0.1,D:0.1):0.2);'

function group(svg: string) {
  return /<g id="tree-overview">(.*?)<\/g><\/g>/s.exec(svg)?.[1]
}

function rects(markup: string) {
  return [...markup.matchAll(/<rect[^>]*>/g)].map(m => m[0])
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

test('the figure carries the overview with the toggle on', async () => {
  const { svg } = await exportWith({ showTreeOverview: true })
  const markup = group(svg)
  expect(markup).toBeDefined()
  expect(markup).toContain('<path')
})

test('and leaves it out with the toggle off', async () => {
  const { svg } = await exportWith({})
  expect(svg).not.toContain('tree-overview')
})

test('the focused subtree is a box on it', async () => {
  const { model, svg } = await exportWith({ showTreeOverview: true })
  const before = rects(group(svg)!).length

  const focused = await exportWith({
    showTreeOverview: true,
    showOnly: model.treeOverviewHit(model.overviewHeight - 1)!.id,
  })
  const drawn = rects(group(focused.svg)!)
  expect(drawn).toHaveLength(before + 1)
  // the box spans the tree column, in the lower half of the band: C and D are
  // the last two of the four tips
  const box = drawn.at(-1)!
  expect(box).toContain(`width="${model.treeAreaWidth - 1}"`)
  expect(Number(/ y="([\d.-]+)"/.exec(box)?.[1])).toBeGreaterThanOrEqual(
    model.overviewHeight / 2 - 1,
  )
})

test('a clade highlight is a rectangle on it', async () => {
  const clades: Clade[] = [
    { mrca: ['C', 'D'], tips: 2, mark: 'highlight', color: 'rgb(1, 2, 3)' },
  ]
  const { svg } = await exportWith({ showTreeOverview: true, clades })
  const drawn = rects(group(svg)!)
  expect(drawn.some(rect => rect.includes('fill="rgb(1,2,3)"'))).toBe(true)
})

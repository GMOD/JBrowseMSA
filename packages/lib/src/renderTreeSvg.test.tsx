// @vitest-environment jsdom
//
// The tree panel of the export. renderTreeCanvas is the shared path, so what
// the live canvas draws is what the figure carries.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const msa = '>a\nAC\n>b\nAC\n>c\nAC\n>d\nAC'

function texts(svg: string) {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]!)
}

async function exportTree(newick: string, drawNodeLabels: boolean) {
  const model = createTestModel({ data: { msa, tree: newick } })
  model.setDrawNodeLabels(drawNodeLabels)
  return texts(
    await renderToSvg(model, {
      theme: createJBrowseTheme(),
      exportType: 'entire',
    }),
  )
}

test('a support value on an internal node exports with the labels on', async () => {
  const drawn = await exportTree('((a,b)95,(c,d)80);', true)
  expect(drawn).toContain('95')
  expect(drawn).toContain('80')
})

test('and stays out of the figure with them off', async () => {
  const drawn = await exportTree('((a,b)95,(c,d)80);', false)
  expect(drawn).toContain('a')
  expect(drawn).not.toContain('95')
})

test('an unlabelled internal node contributes no path-derived id', async () => {
  const drawn = await exportTree('((a,b),(c,d));', true)
  expect(drawn.some(t => t.startsWith('node-'))).toBe(false)
})

test('the reference row tints the tree as it does on screen', async () => {
  const model = createTestModel({
    data: { msa, tree: '((a,b),(c,d));' },
    relativeTo: 'c',
  })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
  const { rowHeight, treeAreaWidth } = model
  const tints = (svg.match(/<rect[^>]*>/g) ?? []).filter(
    r => r.includes('rgb(0,128,255)') && r.includes(`width="${treeAreaWidth}"`),
  )
  expect(tints).toHaveLength(1)
  expect(tints[0]).toContain(`y="${2 * rowHeight}"`)
  expect(tints[0]).toContain(`height="${rowHeight}"`)
})

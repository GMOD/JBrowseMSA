// @vitest-environment jsdom
import React from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { ThemeProvider } from '@mui/material'
import { expect, test } from 'vitest'

import { renderToStaticMarkup } from '../../renderToStaticMarkup.ts'
import { createTestModel, installSvgTestEnv } from '../../svgTestUtil.ts'
import RowPanelHeaders from './RowPanelHeaders.tsx'
import RowPanels from './RowPanels.tsx'

import type { RowPanelSpec } from '../../types.ts'

const rows = Array.from({ length: 100 }, (_, i) => i)
const msa = rows.map(i => `>seq${i}\nACDEFG`).join('\n')

const rowData = Object.fromEntries(
  rows.map(i => [`seq${i}`, { HA: i % 2 ? 'H5' : 'H7' }]),
)

// the blocks draw as they mount, and jsdom has no canvas context
const canvasStub = {
  resetTransform: () => {},
  clearRect: () => {},
  scale: () => {},
  translate: () => {},
  fillRect: () => {},
} as unknown as Partial<CanvasRenderingContext2D>

function mount(rowPanels: RowPanelSpec[]) {
  installSvgTestEnv(canvasStub)
  const model = createTestModel({
    id: 'rowpanels-mount-test',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    rowPanels,
  })
  const markup = (node: React.ReactElement) =>
    renderToStaticMarkup(
      <ThemeProvider theme={createJBrowseTheme()}>{node}</ThemeProvider>,
    )
  return {
    model,
    panels: markup(<RowPanels model={model} />),
    headers: markup(<RowPanelHeaders model={model} />),
  }
}

test('one column per record, each as wide as the record says', () => {
  const { panels } = mount([
    { kind: 'strip', field: 'HA', width: 12 },
    { kind: 'strip', field: 'HA', width: 30 },
  ])
  const columns = [
    ...panels.matchAll(/data-testid="rowpanel_([^"]+)"[^>]*style="([^"]*)"/g),
  ]
  expect(columns.map(m => m[1])).toEqual(['rowpanel-0', 'rowpanel-1'])
  expect(columns.map(m => /width: (\d+)px/.exec(m[2]!)?.[1])).toEqual([
    '12',
    '30',
  ])
})

test('the columns scroll with the alignment', () => {
  const { model } = mount([{ kind: 'strip', field: 'HA' }])
  model.setScrollY(-40)
  const scrolled = renderToStaticMarkup(
    <ThemeProvider theme={createJBrowseTheme()}>
      <RowPanels model={model} />
    </ThemeProvider>,
  )
  expect(scrolled).toContain('translateY(-40px)')
})

test('no records mounts nothing', () => {
  const { panels, headers } = mount([])
  expect(panels).toBe('')
  expect(headers).toBe('')
})

test('each header names its column, and defaults to the field', () => {
  const { headers } = mount([
    { kind: 'strip', field: 'HA' },
    { kind: 'strip', field: 'HA', header: 'HA segment' },
  ])
  expect(headers).toContain('vertical-rl')
  expect([...headers.matchAll(/>([^<>]+)<\/div>/g)].map(m => m[1])).toEqual([
    'HA',
    'HA segment',
  ])
})

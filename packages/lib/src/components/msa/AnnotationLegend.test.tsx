// @vitest-environment jsdom
import React from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { ThemeProvider } from '@mui/material'
import { expect, test } from 'vitest'

import { msaOverlayZIndex } from '../../constants.ts'
import { renderToStaticMarkup } from '../../renderToStaticMarkup.ts'
import { createTestModel, installSvgTestEnv } from '../../svgTestUtil.ts'
import AnnotationLegend from './AnnotationLegend.tsx'
import MSAMouseoverCanvas from './MSAMouseoverCanvas.tsx'

const msa = '>duck\nMKAA\n>chicken\nMKAA'
const rowData = { duck: { HA: 'H5' }, chicken: { HA: 'H7' } }

function mount() {
  installSvgTestEnv()
  const model = createTestModel({
    id: 'legend-zindex-test',
    data: { msa, treeMetadata: JSON.stringify(rowData) },
    rowPanels: [{ kind: 'strip', field: 'HA' }],
  })
  const markup = (node: React.ReactElement) =>
    renderToStaticMarkup(
      <ThemeProvider theme={createJBrowseTheme()}>{node}</ThemeProvider>,
    )
  return {
    legend: markup(<AnnotationLegend model={model} />),
    overlay: markup(<MSAMouseoverCanvas model={model} />),
  }
}

function zIndexOf(markup: string) {
  return Number(/z-index: *(\d+)/.exec(markup)?.[1])
}

test('the key floats above the overlay the tints draw in', () => {
  const { legend, overlay } = mount()
  expect(zIndexOf(overlay)).toBe(msaOverlayZIndex)
  expect(zIndexOf(legend)).toBeGreaterThan(zIndexOf(overlay))
})

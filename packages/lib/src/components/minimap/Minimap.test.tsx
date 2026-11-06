// @vitest-environment jsdom
import React from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { ThemeProvider } from '@mui/material'
import { expect, test } from 'vitest'

import { renderToStaticMarkup } from '../../renderToStaticMarkup.ts'
import { createTestModel, installSvgTestEnv } from '../../svgTestUtil.ts'
import Minimap from './Minimap.tsx'
import { MINIMAP_BAR_HEIGHT } from './minimapLayout.ts'

test('the bar canvas backing store matches its content box', () => {
  installSvgTestEnv()
  const model = createTestModel({
    id: 'minimap-test',
    data: { msa: '>a\nACDEFG\n>b\nACDEFG' },
  })
  model.setHighResScaleFactor(2)
  const markup = renderToStaticMarkup(
    <ThemeProvider theme={createJBrowseTheme()}>
      <Minimap model={model} />
    </ThemeProvider>,
  )
  const canvas = /<canvas[^>]*>/.exec(markup)![0]
  const style = /style="([^"]*)"/.exec(canvas)![1]!
  expect(style).not.toContain('border')
  expect(canvas).toContain(`height="${MINIMAP_BAR_HEIGHT * 2}"`)
  expect(style).toContain(`height: ${MINIMAP_BAR_HEIGHT}px`)
})

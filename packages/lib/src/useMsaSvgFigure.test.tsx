// @vitest-environment jsdom
import React, { act, useEffect } from 'react'

import { createRoot } from 'react-dom/client'
import { beforeAll, expect, test } from 'vitest'

import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'
import { useMsaSvgFigure } from './useMsaSvgFigure.ts'

import type { MsaViewModel } from './model.ts'
import type { MsaSvgFigure } from './useMsaSvgFigure.ts'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

beforeAll(() => {
  installSvgTestEnv()
})

async function waitFor(ready: () => boolean) {
  for (let i = 0; i < 100 && !ready(); i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })
  }
}

test('the figure draws the viewport and redraws after a scroll', async () => {
  const model = createTestModel(
    {
      colWidth: 20,
      treeAreaWidth: 100,
      data: { msa: `>a\n${'ACDEFGHIKL'.repeat(20)}\n>b\n${'W'.repeat(200)}` },
    },
    600,
  )
  let figure: MsaSvgFigure = {}
  function Figure({ model }: { model: MsaViewModel }) {
    const drawn = useMsaSvgFigure(model, { delay: 0 })
    useEffect(() => {
      figure = drawn
    }, [drawn])
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => {
    root.render(<Figure model={model} />)
  })
  await waitFor(() => !!figure.svg)
  const first = figure.svg
  expect(first).toContain('<svg')

  act(() => {
    model.setScrollX(-60)
  })
  expect(model.scrollX).toBe(-60)
  await waitFor(() => figure.svg !== first)
  expect(figure.svg).toContain('<svg')
  expect(figure.svg).not.toBe(first)

  act(() => {
    root.unmount()
  })
})

test('the figure redraws for a highlight a host applies', async () => {
  const model = createTestModel(
    { data: { msa: `>a\n${'ACDEFGHIKL'.repeat(4)}\n>b\n${'W'.repeat(40)}` } },
    600,
  )
  let figure: MsaSvgFigure = {}
  function Figure({ model }: { model: MsaViewModel }) {
    const drawn = useMsaSvgFigure(model, { delay: 0 })
    useEffect(() => {
      figure = drawn
    }, [drawn])
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => {
    root.render(<Figure model={model} />)
  })
  await waitFor(() => !!figure.svg)
  const plain = figure.svg

  act(() => {
    model.applyHighlight('host', [{ rows: ['b'], label: 'picked row' }])
  })
  await waitFor(() => figure.svg !== plain)
  expect(figure.svg).toContain('picked row')
  const highlighted = figure.svg

  act(() => {
    model.setHighlightedColumns([2, 3])
  })
  await waitFor(() => figure.svg !== highlighted)
  expect(figure.svg).not.toBe(highlighted)

  act(() => {
    root.unmount()
  })
})

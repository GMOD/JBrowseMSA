// @vitest-environment jsdom
//
// The zero-config component builds its model once, which used to mean the props
// only seeded it: a host that wanted an expand button or a diff toggle had to
// drop to MSAModelF and rebuild the width measuring, theming and syncing by
// hand. These check that the props stay live -- and that they do not fight the
// user, whose changes inside the viewer have to survive the host's next render.
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'

import MSAViewer from './components/MSAViewer.tsx'

import type { MsaViewModel } from './model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

// MSAViewer renders Loading, which draws to canvas once the data is ready.
// Stubbing it keeps the test on the props-to-model wiring and hands us the
// model MSAViewer built.
let captured: MsaViewModel | undefined
vi.mock('./components/Loading.tsx', () => ({
  default: ({ model }: { model: MsaViewModel }) => {
    captured = model
    return null
  },
}))

const msa = '>human\nMKAANSE\n>mouse\nMKA-NSE\n'

let container: HTMLDivElement
let root: Root

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return { canvas: this } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

beforeEach(() => {
  captured = undefined
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function show(props: Record<string, unknown>) {
  act(() => {
    root.render(<MSAViewer msa={msa} {...props} />)
  })
  return captured!
}

test('the model is built once and reused across renders', () => {
  const model = show({ height: 300 })
  show({ height: 400 })
  expect(captured).toBe(model)
})

test('height, color scheme and zoom follow the props', () => {
  const model = show({
    height: 300,
    colorScheme: 'clustal',
    colWidth: 10,
    rowHeight: 12,
  })
  expect(model.height).toBe(300)

  show({ height: 700, colorScheme: 'lesk', colWidth: 4, rowHeight: 6 })
  expect(model.height).toBe(700)
  expect(model.colorSchemeName).toBe('lesk')
  expect(model.colWidth).toBe(4)
  expect(model.rowHeight).toBe(6)
})

test('dropping relativeTo turns the reference diff back off', () => {
  const model = show({ relativeTo: 'human' })
  expect(model.relativeTo).toBe('human')
  show({})
  expect(model.relativeTo).toBeUndefined()
})

test('the tree gutter follows drawTree and treeAreaWidth', () => {
  const model = show({ drawTree: true, treeAreaWidth: 200 })
  show({ drawTree: false, treeAreaWidth: 132 })
  expect(model.drawTree).toBe(false)
  expect(model.treeAreaWidth).toBe(132)
})

test('a change made inside the viewer survives the host re-rendering', () => {
  // the host passes height and nothing else; the user drags the rows taller and
  // picks another scheme from the menu. A re-render for an unrelated reason
  // must not snap either back
  const model = show({ height: 300 })
  act(() => {
    model.setRowHeight(30)
    model.setColorSchemeName('flower')
  })
  show({ height: 320 })
  expect(model.height).toBe(320)
  expect(model.rowHeight).toBe(30)
  expect(model.colorSchemeName).toBe('flower')
})

// @vitest-environment jsdom
//
// MSAViewer builds its model once. These check that its props stay live, and
// that changes made inside the viewer survive the host's next render.
import React, { act } from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'

import MSAViewer from './components/MSAViewer.tsx'

import type { MsaViewModel } from './model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

// stub Loading, which draws to canvas, and capture the model MSAViewer built
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
  // the host passes only height; the user changes row height and scheme
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

test('the data layers follow their props', () => {
  const model = show({ height: 300 })
  expect(model.highlights).toEqual([])

  show({
    height: 300,
    highlights: [{ start: 2, end: 4, label: 'motif' }],
    columnTracks: [{ id: 't', name: 'T', kind: 'bar', values: [1, 0, 1] }],
    residueMappings: [
      {
        row: 'human',
        accession: 'P1',
        structure: { id: '1ABC', kind: 'experimental', asymId: 'A' },
        segments: [{ rowStart: 1, rowEnd: 7, structStart: 1, structEnd: 7 }],
      },
    ],
    highlightColumns: [1, 2],
  })

  expect(model.highlights.map(h => h.label)).toEqual(['motif'])
  expect(model.columnTracks.map(t => t.id)).toEqual(['t'])
  expect(model.mappedStructures.map(m => m.structure.id)).toEqual(['1ABC'])
  expect(model.highlightedColumns).toEqual([1, 2])
})

test('a layer passed as a fresh array each render is not replaced each render', () => {
  const model = show({ height: 300, highlights: [{ start: 2, end: 4 }] })
  const before = model.highlights[0]
  show({ height: 301, highlights: [{ start: 2, end: 4 }] })
  expect(model.highlights[0]).toBe(before)
})

test('unmounting destroys the model it built', async () => {
  const model = show({ height: 300 })
  act(() => {
    root.unmount()
  })
  // deferred by a tick, so a StrictMode remount can cancel it
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  expect(isAlive(model)).toBe(false)
  // afterEach unmounts again, which is fine on an unmounted root
})

test('a StrictMode double mount keeps its model alive', async () => {
  let captured2: MsaViewModel | undefined
  act(() => {
    root.render(
      <React.StrictMode>
        <MSAViewer msa={msa} height={300} />
      </React.StrictMode>,
    )
  })
  captured2 = captured
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  expect(isAlive(captured2!)).toBe(true)
})

test('hideHeader follows its prop', () => {
  const model = show({ hideHeader: true })
  expect(model.hideHeader).toBe(true)
  show({})
  expect(model.hideHeader).toBe(false)
})

test('a new alignment builds a new model', () => {
  const model = show({ height: 300 })
  act(() => {
    root.render(<MSAViewer msa={'>a\nMK\n>b\nMR\n'} height={300} />)
  })
  expect(captured).not.toBe(model)
  expect(captured!.rowNames).toEqual(['a', 'b'])
})

test('an inline filehandle equal to the last one keeps the model', () => {
  const location = () => ({
    uri: 'https://example.com/a.fa',
    locationType: 'UriLocation' as const,
  })
  act(() => {
    root.render(<MSAViewer msaFilehandle={location()} height={300} />)
  })
  const model = captured
  act(() => {
    root.render(<MSAViewer msaFilehandle={location()} height={301} />)
  })
  expect(captured).toBe(model)
})

test('hover and click report cells in 1-based host coordinates', () => {
  const hovers: unknown[] = []
  const clicks: unknown[] = []
  const model = show({
    onCellHover: (cell: unknown) => hovers.push(cell),
    onCellClick: (cell: unknown) => clicks.push(cell),
  })
  const mouse = model.rowNames.indexOf('mouse')
  act(() => {
    model.setMousePos(4, mouse)
    model.setMouseClickPos(4, mouse)
  })
  act(() => {
    model.setMousePos(3, mouse)
  })
  act(() => {
    model.setMousePos()
  })
  expect(hovers).toEqual([
    { column: 5, row: 'mouse', residue: 4, letter: 'N' },
    { column: 4, row: 'mouse', residue: undefined, letter: '-' },
    undefined,
  ])
  expect(clicks).toEqual([{ column: 5, row: 'mouse', residue: 4, letter: 'N' }])
})

test('the latest handler receives events without resubscribing', () => {
  const first: unknown[] = []
  const second: unknown[] = []
  const model = show({ onCellHover: (c: unknown) => first.push(c) })
  show({ onCellHover: (c: unknown) => second.push(c) })
  act(() => {
    model.setMousePos(0, 0)
  })
  expect(first).toEqual([])
  expect(second).toHaveLength(1)
})

// @vitest-environment jsdom
//
// The chrome around the alignment -- the tree/height resize handles, the
// minimap and the vertical scrollbar -- is all built from the same
// mousedown-then-drag hook, and none of it is exercised by the render tests.
// This mounts the real view and drives one handle of each kind.
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test } from 'vitest'

import MSAView from './components/Loading.tsx'
import MSAModelF from './model.ts'

import type { MsaViewModel } from './model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return {
      canvas: this,
      font: '12px sans-serif',
      measureText: (t: string) => ({ width: t.length * 7 }),
      arc() {},
      beginPath() {},
      clearRect() {},
      closePath() {},
      fill() {},
      fillRect() {},
      fillText() {},
      lineTo() {},
      moveTo() {},
      resetTransform() {},
      scale() {},
      setLineDash() {},
      stroke() {},
      strokeRect() {},
      translate() {},
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

// tall and wide enough that both scrollbars are on screen
const names = Array.from({ length: 20 }, (_, i) => `seq${i}`)
const msa = names.map(name => `>${name}\n${'ACGT'.repeat(25)}`).join('\n')
const tree = `(${names.map(n => `${n}:0.1`).join(',')});`

let container: HTMLDivElement
let root: Root
let model: MsaViewModel

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 200,
    data: { msa, tree },
  })
  model.setWidth(800)
  act(() => {
    root.render(<MSAView model={model} />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function byCursor(cursor: string) {
  return [...container.querySelectorAll<HTMLElement>('div')].filter(
    el => el.style.cursor === cursor,
  )
}

// useDragScroll defers each move to an animation frame, so a drag needs one
// flushed frame before the model has moved
async function drag(el: HTMLElement, { x = 0, y = 0 }) {
  await act(async () => {
    el.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }),
    )
  })
  await act(async () => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }),
    )
    await new Promise(resolve => {
      requestAnimationFrame(resolve)
    })
  })
  await act(async () => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
}

test('the view mounts with both scrollbars', () => {
  expect(container.querySelector('[data-testid="msa_canvas"]')).toBeTruthy()
  expect(model.showVerticalScrollbar).toBe(true)
  expect(model.showHorizontalScrollbar).toBe(true)
  // one horizontal divider (tree/msa), two vertical (view height, and the
  // conservation track's own)
  expect(byCursor('ew-resize')).toHaveLength(1)
  expect(byCursor('ns-resize')).toHaveLength(2)
})

test('dragging the tree divider widens the tree area', async () => {
  const before = model.treeAreaWidth
  await drag(byCursor('ew-resize')[0]!, { x: 60 })
  expect(model.treeAreaWidth).toBe(before + 60)
})

test('dragging the view divider grows the view', async () => {
  const before = model.height
  // the last ns-resize handle is the one below the whole view
  await drag(byCursor('ns-resize').at(-1)!, { y: 50 })
  expect(model.height).toBe(before + 50)
})

test('dragging the scrollbar thumb scrolls the alignment', async () => {
  const thumb = container.querySelector<HTMLElement>(
    'div[style*="cursor: pointer"]',
  )!
  expect(model.scrollX).toBe(0)
  await drag(thumb, { x: 40 })
  expect(model.scrollX).toBeLessThan(0)
})

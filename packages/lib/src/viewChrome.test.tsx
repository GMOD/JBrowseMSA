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
import { scaleBarLength } from './components/tree/scaleBar.ts'
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
// two clades rather than a flat rake, so the branch lengths make it a
// phylogram (a rake carries its lengths on the tips alone, which the model
// reads as a cladogram)
const half = names.length / 2
const clade = (part: string[]) => `(${part.map(n => `${n}:0.1`).join(',')}):0.2`
const tree = `(${clade(names.slice(0, half))},${clade(names.slice(half))});`

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

test('the header offers a go-to box', () => {
  expect(
    container.querySelector('input[placeholder="Go to row or column"]'),
  ).toBeTruthy()
})

test('dragging the tree divider widens the tree area', async () => {
  const before = model.treeAreaWidth
  await drag(byCursor('ew-resize')[0]!, { x: 60 })
  expect(model.treeAreaWidth).toBe(before + 60)
})

test('a divider takes a drag from just beside it', async () => {
  const [zone] = byCursor('ew-resize')[0]!.children
  expect((zone as HTMLElement).style.left).toBe('-4px')
  const before = model.treeAreaWidth
  await drag(zone as HTMLElement, { x: 30 })
  expect(model.treeAreaWidth).toBe(before + 30)
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

function thumbs() {
  return [
    ...container.querySelectorAll<HTMLElement>('div[style*="cursor: pointer"]'),
  ]
}

function pressAt(el: Element, clientX: number, clientY: number) {
  act(() => {
    el.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX, clientY }),
    )
  })
}

test('clicking the minimap bar centers the view there', () => {
  const bar = thumbs()[0]!.previousElementSibling!
  const { msaCanvasWidth, totalWidth } = model
  pressAt(bar, 500, 5)
  expect(model.scrollX).toBe(
    Math.max(
      model.maxScrollX,
      -(500 * totalWidth) / msaCanvasWidth + msaCanvasWidth / 2,
    ),
  )
  expect(model.scrollX).toBeLessThan(0)
})

test('clicking the scrollbar track centers the view there', () => {
  const track = thumbs()[1]!.parentElement!
  const { msaAreaHeight, totalHeight } = model
  pressAt(track, 5, 100)
  expect(model.scrollY).toBe(
    Math.max(
      model.maxScrollY,
      -(100 * totalHeight) / msaAreaHeight + msaAreaHeight / 2,
    ),
  )
  expect(model.scrollY).toBeLessThan(0)
})

test("dragging a data track's divider resizes that track alone", async () => {
  act(() => {
    model.setColumnTracks([
      { id: 'dnds', name: 'dN/dS', kind: 'bar', values: [1, 0.5, 0.25] },
    ])
  })
  const conservation = model.trackHeight('bar')
  const before = model.turnedOnTracks.find(t => t.model.id === 'dnds')!.model
    .height

  // the data track sits above the computed ones, so its handle is the first
  await drag(byCursor('ns-resize')[0]!, { y: 30 })

  const dnds = () =>
    model.turnedOnTracks.find(t => t.model.id === 'dnds')!.model.height
  expect(dnds()).toBe(before + 30)
  expect(model.trackHeight('bar')).toBe(conservation)

  // and the conservation divider leaves the data track where it is: sharing
  // the default no longer means sharing the height
  await drag(byCursor('ns-resize')[1]!, { y: 25 })
  expect(model.trackHeight('bar')).toBe(conservation + 25)
  expect(dnds()).toBe(before + 30)
})

test('one divider resizes conservation and property conservation together', async () => {
  const protein = names.map(n => `>${n}\n${'ACDEFGHIKLMNPQRSTVWY'.repeat(5)}`)
  act(() => {
    model.setMSA(protein.join('\n'))
  })
  expect(model.turnedOnTracks.map(t => t.model.id)).toContain(
    'property-conservation',
  )
  // still the data-track-free count: the pair shares the one handle below it
  expect(byCursor('ns-resize')).toHaveLength(2)

  const before = model.trackHeight('bar')
  await drag(byCursor('ns-resize')[0]!, { y: 40 })

  // the drag splits across the pair, so the bottom edge follows the cursor
  expect(model.trackHeight('bar')).toBe(before + 20)
})

function clickCell(from: { x: number; y: number }, to = from) {
  const block = container.querySelector<HTMLElement>(
    '[data-testid="msa_canvas"] canvas',
  )!
  act(() => {
    block.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        clientX: from.x,
        clientY: from.y,
      }),
    )
    block.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: to.x, clientY: to.y }),
    )
  })
}

test('a click pins the crosshair and a short pan does not', () => {
  clickCell({ x: 30, y: 30 }, { x: 60, y: 30 })
  expect(model.mouseClickCol).toBeUndefined()

  clickCell({ x: 30, y: 30 }, { x: 31, y: 31 })
  expect(model.mouseClickCol).toBe(Math.floor(31 / model.colWidth))
  expect(model.mouseClickRow).toBe(Math.floor(31 / model.rowHeight))
})

function press(key: string, shiftKey = false) {
  const el = container.querySelector<HTMLElement>('[data-testid="msa_canvas"]')!
  expect(el.tabIndex).toBe(0)
  act(() => {
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }),
    )
  })
}

test('the keyboard scrolls and zooms the focused alignment', () => {
  const { colWidth, rowHeight } = model
  press('ArrowRight')
  expect(model.scrollX).toBe(-colWidth)
  press('ArrowDown')
  expect(model.scrollY).toBe(-rowHeight)
  press('ArrowLeft')
  press('ArrowUp')
  expect([model.scrollX, model.scrollY]).toEqual([0, 0])

  press('ArrowRight', true)
  expect(model.scrollX).toBe(Math.max(-model.msaCanvasWidth, model.maxScrollX))
  press('End')
  expect(model.scrollX).toBe(model.maxScrollX)
  press('Home')
  expect(model.scrollX).toBe(0)

  press('+')
  const zoomed = model.colWidth
  expect(zoomed).toBeGreaterThan(colWidth)
  press('-')
  expect(model.colWidth).toBeLessThan(zoomed)
})

test('the dividers are separators', () => {
  expect(container.querySelectorAll('[role="separator"]')).toHaveLength(3)
})

test('the tree gutter carries a scale bar, and the ruler track draws', async () => {
  expect(model.pxPerBranchLength).toBeGreaterThan(0)
  // the gutter above the tree: a path for the bar, and the round length beside
  // it
  const bar = container.querySelector('svg path')
  expect(bar).toBeTruthy()
  expect(container.textContent).toContain(
    scaleBarLength(
      model.pxPerBranchLength,
      model.treeAreaWidth - model.marginLeft * 2,
    )!.label,
  )

  act(() => {
    model.toggleTrack('position-ruler')
  })
  expect(container.textContent).toContain('Position')
})

// @vitest-environment jsdom
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test } from 'vitest'

import MSAView from './components/Loading.tsx'
import TreeMenu from './components/tree/TreeMenu.tsx'
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
      quadraticCurveTo() {},
      resetTransform() {},
      restore() {},
      save() {},
      scale() {},
      setLineDash() {},
      stroke() {},
      strokeRect() {},
      translate() {},
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

const msa = `>a
MKLVIL
>b
MRWVIL
>c
MKWAIL`

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
    height: 300,
    data: {
      msa,
      treeMetadata: JSON.stringify({
        a: { HA: 'H7' },
        b: { HA: 'H5' },
        c: { HA: 'H7' },
      }),
    },
    rowPanels: [{ kind: 'strip', field: 'HA' }],
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

function pointer(
  type: string,
  el: Element,
  init: MouseEventInit,
  offset?: [number, number],
) {
  const event = new MouseEvent(type, { bubbles: true, ...init })
  if (offset) {
    Object.defineProperty(event, 'offsetX', { value: offset[0] })
    Object.defineProperty(event, 'offsetY', { value: offset[1] })
  }
  act(() => {
    el.dispatchEvent(event)
  })
}

function treeBlock() {
  return [...document.querySelectorAll('canvas')].find(c => c.style.cursor)!
}

// the tooltip portals out of the view, so it is the body's text outside it
function tooltipText() {
  return [...document.body.children]
    .filter(el => el !== container)
    .map(el => el.textContent)
    .join('')
}

// jsdom gives every element a zero rect, so clientY is the offset into the
// panel's row space
test('hovering a row panel cell shows the row and its value', () => {
  const canvas = document
    .querySelector('[data-testid="rowpanel_rowpanel-0"]')!
    .querySelector('canvas')!
  pointer('mousemove', canvas, { clientX: 2, clientY: model.rowHeight * 1.5 })
  expect(model.mouseRow).toBe(1)
  expect(tooltipText()).toBe('bHA: H5')
})

test('hovering a leaf label shows its name', () => {
  const leaf = model.leaves[2]!
  expect(tooltipText()).toBe('')
  pointer('mousemove', treeBlock(), {}, [model.marginLeft + 4, leaf.x!])
  expect(model.mouseRow).toBe(2)
  expect(treeBlock().style.cursor).toBe('pointer')
  expect(tooltipText()).toBe(leaf.data.name)
})

function menuItems() {
  return [...document.querySelectorAll('[role="menuitem"]')].map(
    el => el.textContent,
  )
}

test('clicking a leaf label opens the leaf menu', () => {
  const leaf = model.leaves[1]!
  pointer('click', treeBlock(), {}, [model.marginLeft + 4, leaf.x!])
  expect(menuItems()).toEqual([
    leaf.data.name,
    'More info...',
    'Collapse subtree',
    'Indicate differences from this row',
  ])
})

test('a branch menu toggles show-only', () => {
  const { id } = model.hierarchy.data
  let closed = 0
  act(() => {
    root.render(
      <TreeMenu
        node={{ x: 0, y: 0, name: 'Clade', id, leaf: false }}
        model={model}
        onClose={() => {
          closed++
        }}
      />,
    )
  })
  expect(menuItems()).toEqual([
    'Clade',
    'Collapse this node',
    'Show only this node',
  ])
  const items = document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  act(() => {
    items[2]!.click()
  })
  expect(model.showOnly).toBe(id)
  expect(closed).toBe(1)
})

// @vitest-environment jsdom
//
// The gene figure on screen: a tree, a GFF and a `features` panel, with no
// alignment behind them.
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

const rows = Array.from({ length: 30 }, (_, i) => `g${i}`)
const tree = `(${rows.map(name => `${name}:0.1`).join(',')});`
const gff = [
  '##gff-version 3',
  ...rows.flatMap(name => [
    `${name}\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA`,
    `${name}\tncbi\tgene\t600\t1000\t.\t-\t.\tName=genE`,
  ]),
].join('\n')

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
    data: { tree, gff },
    rowPanels: [
      {
        kind: 'features',
        x: 'position',
        width: 216,
        encoding: { label: 'Name' },
        transform: [{ type: 'align', on: 'genE' }],
      },
    ],
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

test('the panel mounts beside a tree with no alignment', () => {
  expect(model.numColumns).toBe(0)
  expect(
    container.querySelector('[data-testid="rowpanel_rowpanel-0"]'),
  ).toBeTruthy()
  expect(container.querySelector('[data-testid="msa_canvas"]')).toBeTruthy()
  // 30 rows of 16px overflow the 200px view, so the scrollbar is on and the
  // header band is as tall as a header
  expect(model.totalHeight).toBe(30 * model.rowHeight)
  expect(model.showVerticalScrollbar).toBe(true)
  expect(model.showHorizontalScrollbar).toBe(false)
  expect(model.rowPanelsHeaderHeight).toBeGreaterThan(0)
})

test('hovering a span names it, its coordinates and its strand', () => {
  const canvas = container.querySelector(
    '[data-testid="rowpanel_rowpanel-0"] canvas',
  )!
  // jsdom gives every element a zero rect, so clientX is the offset into the
  // panel: genE runs from the aligned x to the right edge
  act(() => {
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 190, clientY: 8 }),
    )
  })
  expect(document.body.textContent).toContain('g0')
  expect(document.body.textContent).toContain('genE')
  expect(document.body.textContent).toContain('600-1000 (-)')
  expect(model.mouseRow).toBe(0)
})

// @vitest-environment jsdom
//
// Each track answers for its own column: the hover tooltip over a track reports
// that track's value, where the alignment's own tooltip is about the cell. The
// conservation scores in particular used to pile into the cell tooltip.
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

// col2 is invariant W; col3 is V/V/A, one property class but two identities
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
    data: { msa },
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

// jsdom gives every element a zero rect, so clientX is the offset into the
// track's column space
function hoverColumn(trackId: string, col: number) {
  const el = document.querySelector(`[data-testid="track_${trackId}"]`)!
  act(() => {
    el.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: (col + 0.5) * model.colWidth,
        clientY: 5,
      }),
    )
  })
}

test('hovering a bar track reports that track alone', () => {
  hoverColumn('conservation', 3)
  expect(model.mouseCol).toBe(3)
  expect(document.body.textContent).toContain('Column 4')
  expect(document.body.textContent).toContain('Conservation:')
  expect(document.body.textContent).not.toContain('Property conservation:')
})

test('hovering the property conservation track reports its own score', () => {
  hoverColumn('property-conservation', 3)
  const { textContent } = document.body
  expect(textContent).toContain('Property conservation:')
  // one property class, two identities, so it beats identity conservation
  expect(textContent).toContain(model.propertyConservation[3]!.toFixed(2))
  expect(model.propertyConservation[3]!).toBeGreaterThan(model.conservation[3]!)
})

test('hovering the logo track reports the column composition', () => {
  act(() => {
    model.toggleTrack('sequence-logo')
  })
  hoverColumn('sequence-logo', 1)
  const { textContent } = document.body
  expect(textContent).toContain('bits')
  // col1 = K/R/K
  expect(textContent).toContain('Consensus: K (67%)')
  expect(textContent).toContain('Gaps: 0%')
})

test('no track tooltip with column statistics turned off', () => {
  act(() => {
    model.setShowColumnStats(false)
  })
  hoverColumn('conservation', 3)
  // the hover band still follows the cursor
  expect(model.mouseCol).toBe(3)
  expect(document.body.textContent).not.toContain('Conservation:')
})

test('hovering a cell says nothing about the column', () => {
  const canvas = document
    .querySelector('[data-testid="msa_canvas"]')!
    .querySelector('canvas')!
  act(() => {
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 30, clientY: 10 }),
    )
  })
  expect(model.mouseCol).toBe(2)
  expect(document.body.textContent).not.toContain('Conservation:')
  expect(document.body.textContent).not.toContain('Consensus:')
})

test('leaving a track clears the hover', () => {
  hoverColumn('conservation', 3)
  const el = document.querySelector('[data-testid="track_conservation"]')!
  act(() => {
    // React synthesizes onMouseLeave from mouseout, since mouseleave does not
    // bubble to its listener at the root
    el.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    )
  })
  expect(model.mouseCol).toBeUndefined()
  expect(document.body.textContent).not.toContain('Conservation:')
})

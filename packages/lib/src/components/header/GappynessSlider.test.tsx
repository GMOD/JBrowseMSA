// @vitest-environment jsdom
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import GappynessSlider from './GappynessSlider.tsx'

import type { MsaViewModel } from '../../model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

let container: HTMLDivElement
let root: Root
let model: MsaViewModel

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  model = MSAModelF().create({
    type: 'MsaView',
    hideGaps: true,
    allowedGappyness: 50,
  })
  act(() => {
    root.render(<GappynessSlider model={model} />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function slider() {
  return container.querySelector<HTMLElement>(
    '[data-testid="gappyness_slider"]',
  )!
}

test('dragging moves the thumb and writes the model on release', () => {
  slider().getBoundingClientRect = () =>
    ({
      left: 0,
      width: 100,
      top: 0,
      height: 10,
      bottom: 10,
      right: 100,
    }) as DOMRect
  act(() => {
    slider().dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 80 }),
    )
  })
  expect(container.textContent).toContain('≥80% gaps')
  expect(model.allowedGappyness).toBe(50)

  act(() => {
    document.dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, clientX: 80 }),
    )
  })
  expect(model.allowedGappyness).toBe(80)
  expect(container.textContent).toContain('≥80% gaps')
})

test('a key press writes the model at once', () => {
  const input = slider().querySelector('input')!
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
  })
  expect(model.allowedGappyness).toBe(51)
  expect(container.textContent).toContain('≥51% gaps')
})

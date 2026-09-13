// @vitest-environment jsdom
//
// "Return to import form" after a render error. The model reset fine; the
// React error boundary above it holds its caught error until something
// remounts it, so the button emptied the view and left the error screen up,
// with no way back short of reloading the page.
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import MSAView from './components/Loading.tsx'
import MSAModelF from './model.ts'

import type { MsaViewModel } from './model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

// the view itself throws while rendering, the way a bad colour scheme or a
// malformed tree has
let boom = true
vi.mock('./components/MSAView.tsx', () => ({
  default: () => {
    if (boom) {
      throw new Error('render boom')
    }
    return <div>the alignment</div>
  },
}))

let container: HTMLDivElement
let root: Root
let model: MsaViewModel

beforeEach(() => {
  boom = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  model = MSAModelF().create({
    type: 'MsaView',
    data: { msa: '>a\nACGT\n>b\nACGT' },
  })
  model.setWidth(800)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

test('the button after a render error actually returns to the import form', () => {
  act(() => {
    root.render(<MSAView model={model} />)
  })
  expect(container.textContent).toContain('render boom')

  boom = false
  const button = [...container.querySelectorAll('button')].find(b =>
    b.textContent?.includes('Return to import form'),
  )!
  act(() => {
    button.click()
  })

  expect(container.textContent).not.toContain('render boom')
  expect(model.data.msa).toBeFalsy()
})

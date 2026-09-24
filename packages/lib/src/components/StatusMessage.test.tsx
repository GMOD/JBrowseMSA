// @vitest-environment jsdom
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'

import MSAModelF from '../model.ts'
import StatusMessage from './StatusMessage.tsx'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)

afterEach(() => {
  act(() => {
    root.render(null)
  })
})

function mount(variant: 'page' | 'header') {
  const model = MSAModelF().create({ type: 'MsaView' })
  act(() => {
    root.render(<StatusMessage model={model} variant={variant} />)
  })
  return model
}

test('the header shows nothing without a status', () => {
  mount('header')
  expect(container.textContent).toBe('')
})

test('the page says it is loading before any status arrives', () => {
  mount('page')
  expect(container.textContent).toBe('Loading...')
})

test.each(['page', 'header'] as const)(
  'the %s status cancels through its button',
  variant => {
    const model = mount(variant)
    let cancelled = 0
    act(() => {
      model.setStatus({
        msg: 'Downloading 3 MB',
        onCancel: () => {
          cancelled++
        },
      })
    })
    expect(container.textContent).toContain('Downloading 3 MB')
    act(() => {
      container.querySelector('button')!.click()
    })
    expect(cancelled).toBe(1)
  },
)

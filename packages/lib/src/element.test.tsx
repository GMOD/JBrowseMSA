// @vitest-environment jsdom
import { act } from 'react'

import { afterEach, beforeAll, expect, test, vi } from 'vitest'

import { defineMsaElement } from './element.ts'

import type { MsaViewModel } from './model.ts'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

let captured: MsaViewModel | undefined
vi.mock('./components/Loading.tsx', () => ({
  default: ({ model }: { model: MsaViewModel }) => {
    captured = model
    return null
  },
}))

// a stand-in for <nightingale-manager>: elements register with it, and it
// records the change events that bubble up to it
const registered: HTMLElement[] = []
const changes: Record<string, unknown>[] = []
class FakeManager extends HTMLElement {
  register(element: HTMLElement) {
    registered.push(element)
  }
  unregister() {}
  connectedCallback() {
    this.addEventListener('change', event => {
      changes.push((event as CustomEvent<Record<string, unknown>>).detail)
    })
  }
}

// ref has two leading gaps, so its residue n sits in column n + 2
const row = 'ACDEFGHIKLMNPQRSTVWY'.repeat(5)
const msa = `>ref\n--${row}\n>other\n${row}--\n`

beforeAll(() => {
  customElements.define('nightingale-manager', FakeManager)
  defineMsaElement()
})

afterEach(() => {
  document.body.innerHTML = ''
  registered.length = 0
  changes.length = 0
})

async function setup() {
  const manager = document.createElement('nightingale-manager')
  const element = document.createElement('jbrowse-msa') as HTMLElement & {
    msa?: string
  }
  element.setAttribute('reference-row', 'ref')
  element.setAttribute('tree-area-width', '100')
  element.msa = msa
  manager.append(element)
  await act(async () => {
    document.body.append(manager)
    await Promise.resolve()
  })
  const model = captured!
  act(() => {
    model.setWidth(100 + model.resizeHandleWidth + 500)
    model.setColWidth(10)
  })
  return { element, model }
}

test('the element registers with the manager around it', async () => {
  const { element } = await setup()
  expect(registered).toEqual([element])
})

test('display-start and display-end zoom to residues of the reference row', async () => {
  const { element, model } = await setup()
  changes.length = 0
  await act(async () => {
    element.setAttribute('display-start', '11')
    element.setAttribute('display-end', '20')
    await Promise.resolve()
  })
  expect(model.viewport).toEqual({ startColumn: 13, endColumn: 22 })
  // the range comes back as the one the manager wrote, so nothing is reported
  expect(changes.filter(c => 'display-start' in c)).toEqual([])
})

test('scrolling reports the range in reference-row residues', async () => {
  const { model } = await setup()
  act(() => {
    model.setScrollX(-100)
  })
  expect(changes.at(-1)).toEqual({ 'display-start': 9, 'display-end': 58 })
})

test('hover reports the reference row residue and highlight follows the manager', async () => {
  const { element, model } = await setup()
  act(() => {
    model.setMousePos(6, 1)
  })
  expect(changes.at(-1)).toEqual({ type: 'highlight', value: '5:5' })

  act(() => {
    element.setAttribute('highlight', '3:4')
  })
  expect(model.transientHighlights.nightingale).toEqual([
    { row: 'ref', start: 3, end: 4 },
  ])
  act(() => {
    element.removeAttribute('highlight')
  })
  expect(model.transientHighlights.nightingale).toBeUndefined()
})

// @vitest-environment jsdom
//
// The rendered side of a failed load; modelFilehandleLoaders.test.ts covers the
// model state. A non-abort failure keeps its filehandle, so
// `hasPendingFilehandle` stays true and Loading.tsx must still show the error
// rather than the spinner.
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'

import MSAView from './components/Loading.tsx'
import MSAModelF from './model.ts'

import type { MsaViewModel } from './model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

let container: HTMLDivElement
let root: Root
let model: MsaViewModel

function uri(u: string) {
  return { locationType: 'UriLocation' as const, uri: u }
}

function render() {
  act(() => {
    root.render(<MSAView model={model} />)
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  model = MSAModelF().create({ type: 'MsaView' })
  model.setWidth(800)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

test('a load that fails shows the error rather than a spinner forever', () => {
  // the loader's state after a 403
  model.setMSAFilehandle(uri('https://example.com/blocked.a3m'))
  model.setLoadingMSA(false)
  model.setError(new Error('HTTP 403 fetching blocked.a3m'))
  render()

  expect(container.textContent).toContain('403')
  expect(container.textContent).not.toContain('Loading')
})

test('a failed load keeps the import form and what it holds', () => {
  render()
  const form = container.querySelector('input')
  expect(form).not.toBeNull()

  act(() => {
    model.setMSAFilehandle(uri('https://example.com/missing.fa'))
  })
  expect(form!.closest('[style*="display: none"]')).not.toBeNull()

  act(() => {
    model.setLoadingMSA(false)
    model.setError(new Error('HTTP 404 fetching missing.fa'))
  })
  expect(container.textContent).toContain('404')
  expect(container.textContent).not.toContain('Return to import form')
  expect(container.contains(form)).toBe(true)
  expect(form!.closest('[style*="display: none"]')).toBeNull()
})

test('a load still in flight is a spinner, not an error', () => {
  model.setMSAFilehandle(uri('https://example.com/slow.a3m'))
  render()

  expect(model.loadingMSA).toBe(true)
  expect(container.textContent).not.toContain('Return to import form')
})

// `dataInitialized` is `(msa || tree) && !error`, and every filehandle loader
// shares setError, so a tree or gff that 404s hides a loaded alignment.
test('an error over loaded data says so instead of a bare import form', () => {
  const loaded = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 200,
    data: { msa: '>seq1\nACDE\n>seq2\nACDF' },
  })
  loaded.setWidth(800)
  loaded.setError(new Error('domains.gff 404'))
  act(() => {
    root.render(<MSAView model={loaded} />)
  })

  expect(container.textContent).toContain('domains.gff 404')
})

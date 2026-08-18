// @vitest-environment jsdom
//
// What a failed load LOOKS like, which is a different question from what the
// model recorded. modelFilehandleLoaders.test.ts already pins the model half --
// a rejected fetch sets `error` and clears `loadingMSA`, under the name "a
// failed fetch surfaces as an error" -- and it passed throughout the whole time
// a failed url showed the reader a spinner and nothing else.
//
// The error display was never missing. ImportForm renders `model.error`, and
// the reader could not get to it: a non-abort failure KEEPS its filehandle
// (only an abort clears it), so `hasPendingFilehandle` stayed true and
// Loading.tsx took its spinner branch ahead of the import form, permanently.
// Found on AlphaFold's `files/msa/` prefix answering 403 to every key in August
// 2026 -- the view opened, said "Downloading file" with a Cancel button, and
// was still saying it at 105s.
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
  // the state the loader leaves behind on a 403: the filehandle it could not
  // read is still set, nothing parsed, and the error recorded
  model.setMSAFilehandle(uri('https://example.com/blocked.a3m'))
  model.setLoadingMSA(false)
  model.setError(new Error('HTTP 403 fetching blocked.a3m'))
  render()

  expect(container.textContent).toContain('403')
  expect(container.textContent).not.toContain('Loading')
})

test('a load still in flight is a spinner, not an error', () => {
  model.setMSAFilehandle(uri('https://example.com/slow.a3m'))
  render()

  expect(model.loadingMSA).toBe(true)
  expect(container.textContent).not.toContain('Return to import form')
})

// A guard rather than a pin: this one passes without the fix too, because with
// no filehandle left set the view reaches the ImportForm and that already shows
// the error. It is here so the new branch cannot quietly swallow the case.
//
// It also records the surprise underneath: `dataInitialized` is itself
// `(msa || tree) && !error`, so ANY error hides a loaded alignment, including a
// tree or gff that 404s beside a good one -- setError is shared by every
// filehandle loader. Whether a failed OPTIONAL file should blank a good
// alignment is a real question and a wider one, since `dataInitialized` is read
// in several places; narrowing it is a design change rather than this fix.
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

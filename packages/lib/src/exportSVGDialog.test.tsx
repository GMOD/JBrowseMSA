// @vitest-environment jsdom
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'

import ExportSVGDialog from './components/dialogs/ExportSVGDialog.tsx'
import { createTestModel, syntheticProteinMsa } from './svgTestUtil.ts'

import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

let root: Root | undefined

afterEach(() => {
  act(() => {
    root?.unmount()
  })
})

test('the size warning follows the model while the dialog is open', () => {
  const model = createTestModel({
    data: { msa: syntheticProteinMsa(600, 200) },
  })
  model.setDrawMsaLetters(false)
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root!.render(<ExportSVGDialog model={model} onClose={() => {}} />)
  })
  act(() => {
    document.querySelector<HTMLInputElement>('input[value="entire"]')!.click()
  })
  expect(document.body.textContent).not.toContain('residue letters')

  act(() => {
    model.setDrawMsaLetters(true)
  })
  expect(model.showMsaLetters).toBe(true)
  expect(document.body.textContent).toContain('120k residue letters')
})

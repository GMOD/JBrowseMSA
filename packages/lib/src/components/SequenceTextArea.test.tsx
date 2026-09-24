// @vitest-environment jsdom
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { expect, test } from 'vitest'

import SequenceTextArea, {
  fastaPreview,
  maxShownChars,
  maxShownRecords,
} from './SequenceTextArea.tsx'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const rows = Array.from(
  { length: 5000 },
  (_, i) => [`seq${i}`, 'AC-GT'] as [string, string],
)

test('the preview stops at the record cap', () => {
  const { text, hidden } = fastaPreview(rows, false)
  expect(text.split('\n')).toHaveLength(maxShownRecords * 2)
  expect(text.startsWith('>seq0\nACGT\n>seq1\nACGT')).toBe(true)
  expect(hidden).toBe(rows.length - maxShownRecords)
})

test('the preview stops at the character cap', () => {
  const long = 'A'.repeat(maxShownChars / 2)
  const { text, hidden } = fastaPreview(
    [
      ['a', long],
      ['b', long],
      ['c', long],
    ],
    true,
  )
  expect(text).toBe(`>a\n${long}\n>b\n${long}`)
  expect(hidden).toBe(1)
})

test('the textarea holds the preview and counts the rest', () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => {
    root.render(<SequenceTextArea str={rows} />)
  })
  const textarea = container.querySelector('textarea')!
  expect(textarea.value.split('\n')).toHaveLength(maxShownRecords * 2)
  expect(container.textContent).toContain(
    `Showing ${maxShownRecords} of 5,000 sequences`,
  )
  act(() => {
    root.unmount()
  })
  container.remove()
})

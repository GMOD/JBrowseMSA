import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import stateModelFactory from './model.ts'

const MsaView = stateModelFactory()

test('an empty model is not initialized', () => {
  expect(MsaView.create({ type: 'MsaView' }).dataInitialized).toBe(false)
})

test('inline data initializes the view', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa: '>a\nACGT\n>b\nACGA\n', tree: '' },
  })
  expect(model.dataInitialized).toBe(true)
})

// DataModel's postProcessSnapshot drops a document over 50kb rather than
// inlining it into a session or a shared URL, so it comes back `undefined`
// rather than ''. That has to read as "no data" -- otherwise the restored
// session renders an empty alignment instead of the import form
test('a dropped oversize inline msa restores as uninitialized', () => {
  const msa = `>a\n${'A'.repeat(60_000)}\n>b\n${'C'.repeat(60_000)}\n`
  const model = MsaView.create({ type: 'MsaView', data: { msa, tree: '' } })
  expect(model.dataInitialized).toBe(true)

  const restored = MsaView.create(getSnapshot(model))
  expect(restored.data.msa).toBeUndefined()
  expect(restored.MSA).toBe(null)
  expect(restored.dataInitialized).toBe(false)
})

test('an error keeps the view uninitialized', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa: '>a\nACGT\n', tree: '' },
  })
  model.setError(new Error('boom'))
  expect(model.dataInitialized).toBe(false)
})

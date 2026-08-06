import { expect, test, vi } from 'vitest'

import stateModelFactory from './model.ts'

const MsaView = stateModelFactory()

const msa = '>seq1\nACGT\n>seq2\nACCT\n'

test('treeMetadata is parsed and keyed by row name', () => {
  const model = MsaView.create({ type: 'MsaView' })
  model.setData({
    msa,
    treeMetadata: JSON.stringify({ seq1: { genome: 'Human' } }),
  })
  expect(model.treeMetadata.seq1?.genome).toBe('Human')
  expect(model.treeMetadata.seq2).toBeUndefined()
  expect(model.getRowData('seq1').treeMetadata).toEqual({ genome: 'Human' })
})

test('malformed treeMetadata degrades to empty rather than throwing', () => {
  const model = MsaView.create({ type: 'MsaView' })
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  model.setData({ msa, treeMetadata: '{not json' })

  // treeMetadata comes from a user-supplied file, and consumers of this
  // computed run during layout/render (labelWidthMap measures every label), so
  // a parse failure must not throw out of them
  expect(model.treeMetadata).toEqual({})
  expect(() => model.getRowData('seq1')).not.toThrow()
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})

test('non-object treeMetadata degrades to empty', () => {
  const model = MsaView.create({ type: 'MsaView' })
  model.setData({ msa, treeMetadata: 'null' })
  expect(model.treeMetadata).toEqual({})
  expect(() => model.getRowData('seq1')).not.toThrow()
})

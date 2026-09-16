import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { expect, test, vi } from 'vitest'

import stateModelFactory from './model.ts'

const MsaView = stateModelFactory()

const msa = '>seq1\nACGT\n>seq2\nACCT\n'

test('the row table is parsed and keyed by row name', () => {
  const model = MsaView.create({ type: 'MsaView' })
  model.setData({
    msa,
    treeMetadata: JSON.stringify({ seq1: { genome: 'Human' } }),
  })
  expect(model.rowData.seq1?.genome).toBe('Human')
  expect(model.rowDataOf('seq2')).toBeUndefined()
  expect(model.getRowData('seq1').rowData).toEqual({ genome: 'Human' })
})

test('setRowData round-trips through data.treeMetadata', () => {
  const model = MsaView.create({ type: 'MsaView', data: { msa } })
  model.setRowData({
    seq1: { lineage: '2.3.4.4b', host: 'bovine' },
    seq2: { lineage: '2.3.2.1c', host: 'avian' },
  })

  // the snapshot field keeps the name that travels in existing links
  expect(JSON.parse(model.data.treeMetadata!).seq2.host).toBe('avian')
  expect(model.rowDataOf('seq1')?.lineage).toBe('2.3.4.4b')
  expect(model.rowFields).toEqual(['host', 'lineage'])

  const reloaded = MsaView.create(getSnapshot(model))
  expect(reloaded.rowDataOf('seq2')).toEqual({
    lineage: '2.3.2.1c',
    host: 'avian',
  })
})

test('a row table over the inline limit leaves the snapshot', () => {
  const model = MsaView.create({ type: 'MsaView', data: { msa } })
  const rows = Object.fromEntries(
    Array.from({ length: 5000 }, (_, i) => [
      `seq${i}`,
      { lineage: `clade-${i % 40}`, host: 'avian', segment: 'HA' },
    ]),
  )
  model.setRowData(rows)

  expect(model.rowDataOf('seq4999')?.host).toBe('avian')
  expect(getSnapshot(model).data.treeMetadata).toBeUndefined()
  expect(model.unshareableData.map(d => d.what)).toContain('row metadata')
})

test('a malformed row table degrades to empty rather than throwing', () => {
  const model = MsaView.create({ type: 'MsaView' })
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  model.setData({ msa, treeMetadata: '{not json' })

  // the table comes from a user-supplied file, and consumers of this computed
  // run during layout/render (labelWidthMap measures every label), so a parse
  // failure must not throw out of them
  expect(model.rowData).toEqual({})
  expect(() => model.getRowData('seq1')).not.toThrow()
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})

test('a non-object row table degrades to empty', () => {
  const model = MsaView.create({ type: 'MsaView' })
  model.setData({ msa, treeMetadata: 'null' })
  expect(model.rowData).toEqual({})
  expect(() => model.getRowData('seq1')).not.toThrow()
})

test('resolvedEncodings resolves each scale over the values in the table', () => {
  const model = MsaView.create({ type: 'MsaView', data: { msa } })
  model.setRowData({
    seq1: { clade: '19B' },
    seq2: { clade: '20A' },
  })
  model.setEncodings([
    { channel: 'tipLabel', field: 'clade' },
    {
      channel: 'rowTint',
      field: 'clade',
      scale: { map: { '19B': '#e41a1c' } },
    },
  ])

  const [labels, tints] = model.resolvedEncodings
  expect(labels!.colorOf('19B')).toBe('#F8766D')
  expect(labels!.legend.map(e => e.label)).toEqual(['19B', '20A'])
  expect(tints!.colorOf('20A')).toBeUndefined()
})

test('a scale resolves once per change of its inputs, not per read', () => {
  const model = MsaView.create({ type: 'MsaView', data: { msa } })
  model.setRowData({ seq1: { clade: '19B' }, seq2: { clade: '20A' } })
  model.setEncodings([{ channel: 'tipLabel', field: 'clade' }])

  const resolved: unknown[] = []
  const stop = autorun(() => {
    resolved.push(model.resolvedEncodings[0])
  })
  // each block of each frame reads this; while the table and the encodings
  // stand still the scale is the one already built
  expect(model.resolvedEncodings[0]).toBe(resolved[0])
  expect(model.resolvedEncodings[0]).toBe(resolved[0])

  model.setRowData({ seq1: { clade: '21K' } })
  expect(resolved).toHaveLength(2)
  expect(model.resolvedEncodings[0]!.colorOf('21K')).toBe('#F8766D')
  stop()
})

test('tip label colors and row tints follow the encodings', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa, tree: '(seq1:0.1,seq2:0.2);' },
  })
  model.setWidth(800)
  model.setRowData({ seq1: { clade: '19B' }, seq2: { clade: '20A' } })

  expect(model.tipLabelColors).toBeUndefined()
  expect(model.rowTints).toBeUndefined()

  model.setEncodings([
    { channel: 'tipLabel', field: 'clade' },
    {
      channel: 'rowTint',
      field: 'clade',
      scale: { map: { '19B': '#ff0000' } },
    },
  ])

  expect(model.tipLabelColors?.get('seq1')).toBe('#F8766D')
  expect(model.rowNames).toEqual(['seq1', 'seq2'])
  // the scale's color washed to the tint alpha, and nothing for the row the
  // map leaves out
  expect(model.rowTints).toEqual(['rgba(255, 0, 0, 0.25)', undefined])
})

test('a tint color that carries its own alpha keeps it', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa, tree: '(seq1:0.1,seq2:0.2);' },
  })
  model.setWidth(800)
  model.setRowData({ seq1: { clade: '19B' } })
  model.setEncodings([
    {
      channel: 'rowTint',
      field: 'clade',
      scale: { map: { '19B': 'rgba(0,0,255,0.6)' } },
    },
  ])
  expect(model.rowTints?.[0]).toBe('rgba(0,0,255,0.6)')
})

test('the branch channel colors each clade whose tips agree', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: {
      msa: '>a\nACGT\n>b\nACGT\n>c\nACGT\n>d\nACGT\n',
      tree: '((a:0.1,b:0.1):0.2,(c:0.1,d:0.1):0.2);',
    },
  })
  model.setWidth(800)
  model.setRowData({
    a: { clade: 'left' },
    b: { clade: 'left' },
    c: { clade: 'right' },
    d: { clade: 'right' },
  })

  expect(model.branchColors).toBeUndefined()

  model.setEncodings([
    {
      channel: 'branch',
      field: 'clade',
      scale: { map: { left: '#ff0000', right: '#0000ff' } },
    },
  ])

  const { tree, branchColors } = model
  const [left, right] = tree.children
  expect(branchColors?.get(left!.id)).toBe('#ff0000')
  expect(branchColors?.get(left!.children[0]!.id)).toBe('#ff0000')
  expect(branchColors?.get(right!.id)).toBe('#0000ff')
  // the two clades disagree at the root, which leaves its edge the default
  expect(branchColors?.get(tree.id)).toBeUndefined()
})

test('a branch value the scale gives no color takes none', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa, tree: '(seq1:0.1,seq2:0.2);' },
  })
  model.setWidth(800)
  model.setRowData({ seq1: { clade: '19B' }, seq2: { clade: '20A' } })
  model.setEncodings([
    {
      channel: 'branch',
      field: 'clade',
      scale: { map: { '19B': '#ff0000' } },
    },
  ])

  const { tree, branchColors } = model
  expect(branchColors?.get(tree.children[0]!.id)).toBe('#ff0000')
  expect(branchColors?.get(tree.children[1]!.id)).toBeUndefined()
})

test('reset drops the row table and the encodings', () => {
  const model = MsaView.create({ type: 'MsaView', data: { msa } })
  model.setRowData({ seq1: { clade: '19B' } })
  model.setEncodings([{ channel: 'tipLabel', field: 'clade' }])
  model.reset()

  // an encoding naming a field of the file that just closed would color nothing
  expect(model.rowData).toEqual({})
  expect(model.encodings).toEqual([])
})

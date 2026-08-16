import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import stateModelFactory from './model.ts'

const MsaView = stateModelFactory()

test('default view produces a minimal snapshot (defaults stripped)', () => {
  const model = MsaView.create({ type: 'MsaView' })
  const snap = getSnapshot(model)
  // only the always-present keys remain; every defaulted scalar/collection is gone
  expect(snap.colWidth).toBeUndefined()
  expect(snap.rowHeight).toBeUndefined()
  expect(snap.showDomains).toBeUndefined()
  expect(snap.colorSchemeName).toBeUndefined()
  expect(snap.drawTree).toBeUndefined()
  expect(snap.treeAreaWidth).toBeUndefined()
  expect(snap.collapsed).toBeUndefined()
  expect(snap.turnedOffTracks).toBeUndefined()
  expect(snap.type).toBe('MsaView')
})

test('non-default values are retained in the snapshot', () => {
  const model = MsaView.create({ type: 'MsaView' })
  model.setColWidth(30)
  model.setColorSchemeName('clustalx')
  model.setDrawTree(false)
  model.toggleCollapsed('nodeA')
  const snap = getSnapshot(model)
  expect(snap.colWidth).toBe(30)
  expect(snap.colorSchemeName).toBe('clustalx')
  expect(snap.drawTree).toBe(false)
  expect(snap.collapsed).toEqual(['nodeA'])
})

test('setting a value back to its default strips it again', () => {
  const model = MsaView.create({ type: 'MsaView' })
  model.setColWidth(30)
  expect(getSnapshot(model).colWidth).toBe(30)
  model.setColWidth(12) // defaultColWidth
  expect(getSnapshot(model).colWidth).toBeUndefined()
})

test('inline data is stripped when a filehandle can refetch it', () => {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa: '>s1\nACGT', tree: '(a,b);' },
    msaFilehandle: {
      uri: 'http://example.com/x.fa',
      locationType: 'UriLocation',
    },
  })
  const snap = getSnapshot(model)
  // msa dropped (msaFilehandle present), tree kept (no treeFilehandle)
  expect(snap.data.msa).toBeUndefined()
  expect(snap.data.tree).toBe('(a,b);')
})

test('inline gff survives the snapshot when no gffFilehandle can refetch it', () => {
  const gff = 's1\tx\tprotein_match\t1\t3\t.\t.\t.\tName=PF1'
  const withInlineGff = MsaView.create({
    type: 'MsaView',
    data: { msa: '>s1\nACGT', gff },
  })
  expect(getSnapshot(withInlineGff).data.gff).toBe(gff)

  const withFilehandle = MsaView.create({
    type: 'MsaView',
    data: { msa: '>s1\nACGT', gff },
    gffFilehandle: {
      uri: 'http://example.com/x.gff',
      locationType: 'UriLocation',
    },
  })
  expect(getSnapshot(withFilehandle).data.gff).toBeUndefined()
})

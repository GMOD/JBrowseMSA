import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import stateModelFactory from './model.ts'

const msa = `>Human\n${'MEEPQSDPSV'.repeat(20)}\n>Mouse\n${'MEE-QSDPSV'.repeat(20)}`

test('a region waits for the view to have a width, zooms, and is dropped', () => {
  const region = { row: 'Human', start: 150, end: 160 }
  const model = stateModelFactory().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    region,
  })
  expect(model.region).toEqual(region)

  model.setWidth(800)
  expect(model.region).toBeUndefined()
  expect(model.scrollX).toBeLessThan(0)
  expect(JSON.stringify(getSnapshot(model))).not.toContain('region')
})

test('a region waits for a tree file to load', () => {
  const model = stateModelFactory().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    treeFilehandle: { uri: 'https://example.com/never.nh' },
    region: { start: 10, end: 20 },
  })
  model.setWidth(800)
  expect(model.region).toEqual({ start: 10, end: 20 })
})

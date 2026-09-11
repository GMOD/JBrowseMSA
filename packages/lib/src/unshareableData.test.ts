// A file opened from disk or pasted in becomes inline text, and the snapshot
// drops an inline document past maxInlineSnapshotBytes. The view keeps working,
// so the only way anyone learns the link is empty is if the model says so.
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { maxInlineSnapshotBytes } from './constants.ts'
import stateModelFactory from './model.ts'

import type { MsaViewModel } from './model.ts'

const MsaView = stateModelFactory()

function fasta(rows: number) {
  return Array.from(
    { length: rows },
    (_, i) => `>seq${i}\n${'ACDEFGHIKL'.repeat(20)}`,
  ).join('\n')
}

const bigMsa = fasta(400)
const smallMsa = fasta(2)

function snapshotOf(model: MsaViewModel) {
  return JSON.parse(JSON.stringify(getSnapshot(model))) as {
    data?: { msa?: string; tree?: string; gff?: string }
  }
}

test('a small pasted alignment travels in the snapshot and is not flagged', () => {
  expect(smallMsa.length).toBeLessThan(maxInlineSnapshotBytes)
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: smallMsa },
  })
  expect(model.unshareableData).toEqual([])
  expect(snapshotOf(model).data?.msa).toBe(smallMsa)
})

test('a large pasted alignment renders but leaves the snapshot, and says so', () => {
  expect(bigMsa.length).toBeGreaterThan(maxInlineSnapshotBytes)
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: bigMsa },
  })
  expect(model.rows.length).toBe(400)
  expect(snapshotOf(model).data?.msa).toBeUndefined()
  expect(model.unshareableData).toEqual([
    { what: 'alignment', bytes: bigMsa.length },
  ])
})

test('the same alignment behind a URL is shareable at any size', () => {
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    msaFilehandle: { locationType: 'UriLocation', uri: 'http://x/aln.fa' },
  })
  model.setMSA(bigMsa)
  expect(model.rows.length).toBe(400)
  // the text is dropped, but the filehandle that refetches it is not
  expect(snapshotOf(model).data?.msa).toBeUndefined()
  expect(model.unshareableData).toEqual([])
})

test('every oversized document is named, largest first', () => {
  const bigTree = `(${Array.from({ length: 6000 }, (_, i) => `leaf${i}:0.1`).join(',')});`
  expect(bigTree.length).toBeGreaterThan(maxInlineSnapshotBytes)
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: bigMsa, tree: bigTree },
  })
  expect(model.unshareableData.map(d => d.what)).toEqual(
    bigMsa.length > bigTree.length
      ? ['alignment', 'tree']
      : ['tree', 'alignment'],
  )
})

test('a gff keeps its text, so annotations are not lost with the filehandle', () => {
  const gff =
    '##gff-version 3\nseq0\tPfam\tprotein_match\t1\t20\t.\t.\t.\tName=PF00069'
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: smallMsa },
  })
  model.setGFF(gff)
  expect(model.data.gff).toBe(gff)
  expect(snapshotOf(model).data?.gff).toBe(gff)
  expect(model.unshareableData).toEqual([])
})

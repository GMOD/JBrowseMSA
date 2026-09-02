import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import stateModelFactory from './model.ts'

import type { ColumnTrackSpec } from './types.ts'

const MsaView = stateModelFactory()

// s1 has a gap at column 1 and s2 a gap at column 3, and every row is gapped at
// column 5, so hiding gappy columns drops that one
const msa = '>s1\nA-CDE-F\n>s2\nAB-DE-F\n>s3\nABCDE-F\n'

function makeModel(columnTracks: ColumnTrackSpec[]) {
  return MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    columnTracks,
  })
}

test('column-indexed values normalize by max and clamp to 0..1', () => {
  const model = makeModel([
    { id: 't', name: 'T', kind: 'bar', values: [1, 2, 4, -1], max: 2 },
  ])
  expect(model.columnTrackContent.get('t')?.values).toEqual([0.5, 1, 1, 0])
})

test('row-indexed values land on the residues of that row', () => {
  const model = makeModel([
    { id: 't', name: 'T', kind: 'bar', values: [0.1, 0.2, 0.3], row: 's1' },
  ])
  // residues 1..3 of s1 are A, C, D at global columns 0, 2, 3
  expect(model.columnTrackContent.get('t')?.values).toEqual([
    0.1, 0, 0.2, 0.3, 0, 0, 0,
  ])
})

test('a row-indexed text track spreads its letters the same way', () => {
  const model = makeModel([
    { id: 'f', name: 'Frame', kind: 'text', data: '123', row: 's2' },
  ])
  // residues of s2 sit at columns 0, 1, 3
  expect(model.columnTrackContent.get('f')?.data).toBe('12 3   ')
})

test('hiding gappy columns drops them from the values and the text', () => {
  const model = makeModel([
    { id: 't', name: 'T', kind: 'bar', values: [1, 2, 3, 4, 5, 6, 7], max: 7 },
    { id: 'f', name: 'F', kind: 'text', data: 'abcdefg' },
  ])
  model.setHideGaps(true)
  model.setAllowedGappyness(99)
  expect(model.blanks).toEqual([5])
  expect(model.columnTrackContent.get('t')?.values).toHaveLength(6)
  expect(model.columnTrackContent.get('f')?.data).toBe('abcdeg')
})

test('data tracks join the track list with their own color and height', () => {
  const model = makeModel([
    { id: 't', name: 'dN/dS', kind: 'bar', values: [1], color: 'red' },
    { id: 'f', name: 'Frame', kind: 'text', data: '1', colors: { 1: 'blue' } },
  ])
  const ids = model.tracks.map(t => t.model.id)
  expect(ids).toContain('t')
  expect(ids).toContain('f')
  const bar = model.tracks.find(t => t.model.id === 't')!.model
  expect(bar.barColor).toBe('red')
  expect(bar.height).toBe(model.conservationTrackHeight)
  const text = model.tracks.find(t => t.model.id === 'f')!.model
  expect(text.customColorScheme).toEqual({ 1: 'blue' })
  expect(text.height).toBe(model.rowHeight)
  expect(text.data).toBe('1')

  expect(model.turnedOnTracks.map(t => t.model.id)).toContain('t')
  model.toggleTrack('t')
  expect(model.turnedOnTracks.map(t => t.model.id)).not.toContain('t')
})

test('setColumnTracks replaces the set and the snapshot carries it', () => {
  const model = makeModel([])
  expect(getSnapshot(model)).not.toHaveProperty('columnTracks')
  model.setColumnTracks([{ id: 't', name: 'T', kind: 'bar', values: [0.5] }])
  expect(getSnapshot(model).columnTracks).toEqual([
    { id: 't', name: 'T', kind: 'bar', values: [0.5] },
  ])
})

test('a track too large to share leaves the snapshot but keeps drawing', () => {
  const model = makeModel([
    { id: 'big', name: 'Big', kind: 'bar', values: Array(20_000).fill(0.5) },
    { id: 'small', name: 'Small', kind: 'bar', values: [0.5] },
  ])
  expect(model.columnTrackContent.get('big')?.values).toHaveLength(20_000)
  expect(getSnapshot(model).columnTracks?.map(t => t.id)).toEqual(['small'])
})

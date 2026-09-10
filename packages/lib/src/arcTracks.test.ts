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

// a hairpin plus a pseudoknot crossing out of it, the RF00507 shape
const stockholm = `# STOCKHOLM 1.0
s1 GGGAAACCCUUU
s2 GGGAAACCCUUU
#=GC SS_cons <<<AAA>>>aaa
//
`

test('column-indexed arcs are 1-based and inclusive', () => {
  const model = makeModel([
    { id: 'a', name: 'A', kind: 'arc', arcs: [{ start: 1, end: 7 }] },
  ])
  expect(model.columnTrackContent.get('a')?.arcs).toEqual([
    { start: 0, end: 6, color: undefined },
  ])
})

test('row-indexed arcs land on that row s residues', () => {
  const model = makeModel([
    {
      id: 'a',
      name: 'A',
      kind: 'arc',
      arcs: [{ start: 1, end: 3, color: 'red' }],
      row: 's1',
    },
  ])
  // residues 1 and 3 of s1 (A and D) sit at global columns 0 and 3
  expect(model.columnTrackContent.get('a')?.arcs).toEqual([
    { start: 0, end: 3, color: 'red' },
  ])
})

test('a reversed or degenerate pair is normalized or dropped', () => {
  const model = makeModel([
    {
      id: 'a',
      name: 'A',
      kind: 'arc',
      arcs: [
        { start: 5, end: 2 },
        { start: 3, end: 3 },
        { start: 1, end: 99 },
      ],
    },
  ])
  expect(model.columnTrackContent.get('a')?.arcs).toEqual([
    { start: 1, end: 4, color: undefined },
  ])
})

test('hiding gappy columns collapses an arc rather than dropping it', () => {
  const model = makeModel([
    { id: 'a', name: 'A', kind: 'arc', arcs: [{ start: 1, end: 6 }] },
  ])
  model.setHideGaps(true)
  model.setAllowedGappyness(99)
  expect(model.blanks).toEqual([5])
  // column 6 (0-based 5) is the hidden one, and its arc still draws, anchored
  // where that column collapsed to
  expect(model.columnTrackContent.get('a')?.arcs).toEqual([
    { start: 0, end: 5, color: undefined },
  ])
})

test('an arc track joins the track list with its own height and color', () => {
  const model = makeModel([
    {
      id: 'a',
      name: 'Contacts',
      kind: 'arc',
      arcs: [{ start: 1, end: 4 }],
      color: 'red',
    },
  ])
  const track = model.tracks.find(t => t.model.id === 'a')!.model
  expect(track.arcColor).toBe('red')
  expect(track.height).toBe(model.arcTrackHeight)
  expect(track.arcs).toHaveLength(1)
})

test('SS_cons becomes a base-pair track, pseudoknots in their own color', () => {
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'stockholm',
    data: { msa: stockholm },
  })
  const arcs = model.secondaryStructureArcs!
  expect(arcs).toHaveLength(6)
  // the three nested pairs of the hairpin, then the three knot pairs
  expect(arcs.filter(a => a.color === arcs[0]!.color)).toHaveLength(3)
  expect(arcs.map(a => [a.start, a.end])).toEqual([
    [0, 8],
    [1, 7],
    [2, 6],
    [3, 11],
    [4, 10],
    [5, 9],
  ])
  expect(arcs[0]!.color).not.toBe(arcs[3]!.color)
  expect(model.tracks.map(t => t.model.id)).toContain('base-pairs')
})

test('an alignment with no SS_cons has no base-pair track', () => {
  const model = makeModel([])
  expect(model.secondaryStructureArcs).toBeUndefined()
  expect(model.tracks.map(t => t.model.id)).not.toContain('base-pairs')
})

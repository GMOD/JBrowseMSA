import { expect, test } from 'vitest'

import stateModelFactory from './model.ts'

import type { ColumnTrackSpec } from './types.ts'

const MsaView = stateModelFactory()

// s1 has a gap at column 2 and every row is gapped at column 6, so hiding
// gappy columns drops that one
const msa = '>s1\nA-CDE-FGHI\n>s2\nABCDE-FGHI\n'

function makeModel(columnTracks: ColumnTrackSpec[]) {
  return MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    columnTracks,
  })
}

function spansOf(model: ReturnType<typeof makeModel>, id: string) {
  return model.columnTrackContent
    .get(id)
    ?.spans?.map(({ annotation, startCol, endCol, lane, laneCount }) => ({
      name: annotation.name,
      startCol,
      endCol,
      lane,
      laneCount,
    }))
}

const secondaryStructure: ColumnTrackSpec = {
  id: 'ss',
  name: 'Secondary structure',
  kind: 'features',
  features: [
    { start: 1, end: 3, type: 'helix', name: 'H1' },
    { start: 4, end: 7, type: 'strand', name: 'E1', strand: '+' },
    { start: 8, end: 10, type: 'helix', name: 'H2' },
  ],
  encoding: {
    fill: { field: 'type', scale: { domain: ['helix', 'strand'] } },
    text: { field: 'name' },
  },
}

test('column spans are 1-based and inclusive, adjacent ones share a lane', () => {
  const model = makeModel([secondaryStructure])
  expect(spansOf(model, 'ss')).toEqual([
    { name: 'H1', startCol: 0, endCol: 3, lane: 0, laneCount: 1 },
    { name: 'E1', startCol: 3, endCol: 7, lane: 0, laneCount: 1 },
    { name: 'H2', startCol: 7, endCol: 10, lane: 0, laneCount: 1 },
  ])
})

test('row spans land on that row s residues', () => {
  const model = makeModel([
    {
      id: 'pfam',
      name: 'Pfam',
      kind: 'features',
      row: 's1',
      features: [{ start: 2, end: 4, name: 'SH3' }],
    },
  ])
  // residues 2-4 of s1 (C, D, E) sit at columns 3-5, 0-based 2-4
  expect(spansOf(model, 'pfam')).toEqual([
    { name: 'SH3', startCol: 2, endCol: 5, lane: 0, laneCount: 1 },
  ])
})

test('an end past the row clamps, and a start past it drops the span', () => {
  const model = makeModel([
    {
      id: 'pfam',
      name: 'Pfam',
      kind: 'features',
      row: 's1',
      features: [
        { start: 6, end: 99, name: 'tail' },
        { start: 50, end: 60, name: 'past' },
      ],
    },
  ])
  // residue 6 of s1 is G at column 8, and its last residue I is at column 10
  expect(spansOf(model, 'pfam')).toEqual([
    { name: 'tail', startCol: 7, endCol: 10, lane: 0, laneCount: 1 },
  ])
})

test('overlapping spans pack into lanes and the track grows a lane each', () => {
  const model = makeModel([
    {
      id: 'exons',
      name: 'Exons',
      kind: 'features',
      features: [
        { start: 1, end: 6, name: 'a' },
        { start: 4, end: 9, name: 'b' },
      ],
    },
  ])
  expect(spansOf(model, 'exons')?.map(s => [s.lane, s.laneCount])).toEqual([
    [0, 2],
    [1, 2],
  ])
  const track = model.tracks.find(t => t.model.id === 'exons')!
  expect(track.model.height).toBe(36)
  expect(track.model.heightKey).toBe('own:exons')
})

test('strandpile puts forward spans above reverse ones', () => {
  const model = makeModel([
    {
      id: 'genes',
      name: 'Genes',
      kind: 'features',
      position: 'strandpile',
      features: [
        { start: 1, end: 4, name: 'rev', strand: '-' },
        { start: 3, end: 8, name: 'fwd', strand: '+' },
      ],
    },
  ])
  expect(spansOf(model, 'genes')?.map(s => [s.name, s.lane])).toEqual([
    ['fwd', 0],
    ['rev', 1],
  ])
})

test('hiding gappy columns remaps a span and shrinks one across them', () => {
  const model = makeModel([secondaryStructure])
  model.setHideGaps(true)
  model.setAllowedGappyness(99)
  expect(model.blanks).toEqual([5])
  expect(spansOf(model, 'ss')).toEqual([
    { name: 'H1', startCol: 0, endCol: 3, lane: 0, laneCount: 1 },
    { name: 'E1', startCol: 3, endCol: 6, lane: 0, laneCount: 1 },
    { name: 'H2', startCol: 6, endCol: 9, lane: 0, laneCount: 1 },
  ])
})

test('a span on hidden columns alone draws nothing', () => {
  const model = makeModel([
    {
      id: 'gap',
      name: 'Gap',
      kind: 'features',
      features: [{ start: 6, end: 6, name: 'gap' }],
    },
  ])
  model.setHideGaps(true)
  model.setAllowedGappyness(99)
  expect(spansOf(model, 'gap')).toEqual([])
})

test('fill reads a span field through the scale, and a span color wins', () => {
  const model = makeModel([
    {
      ...secondaryStructure,
      features: [
        ...secondaryStructure.features!,
        { start: 2, end: 2, type: 'helix', name: 'site', color: '#ff0000' },
      ],
      encoding: {
        fill: {
          field: 'type',
          scale: { domain: ['helix', 'strand'], range: ['#e41a1c', '#377eb8'] },
        },
        text: { field: 'name' },
      },
    },
  ])
  const { colors, labels } = model.featureTrackScales.get('ss')!
  const fills = Object.fromEntries(
    [...colors].map(([annotation, { fill }]) => [annotation.name, fill]),
  )
  expect(fills).toEqual({
    H1: '#e41a1c',
    E1: '#377eb8',
    H2: '#e41a1c',
    site: '#ff0000',
  })
  expect([...labels!.values()]).toEqual(['H1', 'E1', 'H2', 'site'])
})

test('a track without a fill encoding takes its own color', () => {
  const model = makeModel([
    {
      id: 'plain',
      name: 'Plain',
      kind: 'features',
      color: '#123456',
      features: [{ start: 1, end: 3 }],
    },
  ])
  const { colors } = model.featureTrackScales.get('plain')!
  expect([...colors.values()].map(c => c.fill)).toEqual(['#123456'])
})

test('a shown track lists its fill scale among the legends', () => {
  const model = makeModel([secondaryStructure])
  const legend = model.legends.find(l => l.title === 'type')
  expect(legend?.entries.map(e => e.label)).toEqual(['helix', 'strand'])
  model.toggleTrack('ss')
  expect(model.legends.find(l => l.title === 'type')).toBeUndefined()
})

test('a track and a features panel declaring one scale share it', () => {
  const fill = { field: 'type', scale: { scheme: 'set1' } }
  const model = MsaView.create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    features: [{ row: 's2', start: 1, end: 4, type: 'domain' }],
    rowPanels: [{ kind: 'features', x: 'column', encoding: { fill } }],
    columnTracks: [{ ...secondaryStructure, encoding: { fill } }],
  })
  const legends = model.legends.filter(l => l.title === 'type')
  expect(legends).toHaveLength(1)
  expect(legends[0]!.entries.map(e => e.label)).toEqual([
    'domain',
    'helix',
    'strand',
  ])
})

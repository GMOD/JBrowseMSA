import { expect, test } from 'vitest'

import { expandSpec, residueLabel } from './expandSpec.ts'
import stateModelFactory from './model.ts'

test('a long-form snapshot passes through unchanged', () => {
  const snapshot = {
    type: 'MsaView',
    relativeTo: 'a',
    msaFilehandle: { uri: 'x.fa' },
    highlights: [
      { start: 1, end: 3 },
      { row: 'a', start: 2, end: 2 },
    ],
    columnTracks: [
      { id: 't', name: 'T', kind: 'bar' as const, values: [1], row: 'a' },
    ],
  }
  expect(expandSpec(snapshot)).toEqual(snapshot)
})

test('expanding twice gives what expanding once does', () => {
  const spec = {
    query: 'Human',
    msa: 'https://example.com/a.afa',
    highlights: ['102-292 DNA-binding', 175],
    region: '170-290',
    columnTracks: [{ name: 'ClinVar', start: 3, values: [1, 2] }],
  }
  const once = expandSpec(spec)
  expect(expandSpec(once)).toEqual(once)
})

test('msa and tree take a url or the text itself', () => {
  expect(expandSpec({ msa: 'a.afa', tree: 'a.nh' })).toEqual({
    msaFilehandle: { uri: 'a.afa', locationType: 'UriLocation' },
    treeFilehandle: { uri: 'a.nh', locationType: 'UriLocation' },
  })
  expect(expandSpec({ msa: '>a\nAC\n>b\nAD', tree: '(a,b);' })).toEqual({
    data: { msa: '>a\nAC\n>b\nAD', tree: '(a,b);' },
  })
})

test('query sets relativeTo, and an explicit relativeTo wins', () => {
  expect(expandSpec({ query: 'Human' })).toEqual({ relativeTo: 'Human' })
  expect(expandSpec({ query: 'Human', relativeTo: 'Mouse' })).toEqual({
    relativeTo: 'Mouse',
  })
})

test('highlight shorthand: a residue, a labeled range, on the query row', () => {
  expect(
    expandSpec({ query: 'H', highlights: [175, '248', '102-292 DNA-binding'] })
      .highlights,
  ).toEqual([
    { row: 'H', start: 175, end: 175, label: residueLabel },
    { row: 'H', start: 248, end: 248, label: residueLabel },
    { row: 'H', start: 102, end: 292, label: 'DNA-binding' },
  ])
})

test('without a query, shorthand highlights are alignment columns', () => {
  expect(expandSpec({ highlights: [5, '1-3 head'] }).highlights).toEqual([
    { start: 5, end: 5 },
    { start: 1, end: 3, label: 'head' },
  ])
})

test('object entries default to the query row, and row: null opts out', () => {
  expect(
    expandSpec({
      query: 'H',
      highlights: [
        { start: 1, end: 2, color: 'red' },
        { row: null, start: 3, end: 4 },
        { rows: ['a', 'b'] },
      ],
    }).highlights,
  ).toEqual([
    { row: 'H', start: 1, end: 2, color: 'red' },
    { start: 3, end: 4 },
    { rows: ['a', 'b'] },
  ])
})

test('region takes "start-end" on the query row', () => {
  expect(expandSpec({ query: 'H', region: '170-290' }).region).toEqual({
    row: 'H',
    start: 170,
    end: 290,
  })
  expect(expandSpec({ region: '10-20' }).region).toEqual({ start: 10, end: 20 })
})

test('a span written end first reads in order', () => {
  expect(expandSpec({ region: '20-10' }).region).toEqual({ start: 10, end: 20 })
  expect(expandSpec({ highlights: ['9-3 loop'] }).highlights).toEqual([
    { start: 3, end: 9, label: 'loop' },
  ])
})

test('a malformed span names itself', () => {
  expect(() => expandSpec({ highlights: ['R175'] })).toThrow(/highlight "R175"/)
  expect(() => expandSpec({ region: '170..290' })).toThrow(/region "170..290"/)
})

test('column tracks take id, kind and row from what they carry', () => {
  expect(
    expandSpec({
      query: 'H',
      columnTracks: [
        { name: 'ClinVar pathogenic', values: [1] },
        { name: 'ClinVar pathogenic', values: [2] },
        { name: 'SS', data: 'HHE' },
        { name: 'Contacts', arcs: [{ start: 1, end: 5 }], row: null },
      ],
    }).columnTracks,
  ).toEqual([
    {
      id: 'clinvar-pathogenic',
      name: 'ClinVar pathogenic',
      kind: 'bar',
      row: 'H',
      values: [1],
    },
    {
      id: 'clinvar-pathogenic-2',
      name: 'ClinVar pathogenic',
      kind: 'bar',
      row: 'H',
      values: [2],
    },
    { id: 'ss', name: 'SS', kind: 'text', row: 'H', data: 'HHE' },
    {
      id: 'contacts',
      name: 'Contacts',
      kind: 'arc',
      arcs: [{ start: 1, end: 5 }],
    },
  ])
})

test('start pads the positions before it', () => {
  const [bar, text] = expandSpec({
    columnTracks: [
      { name: 'b', start: 3, values: [7, 8] },
      { name: 't', start: 2, data: 'X' },
    ],
  }).columnTracks as { values?: number[]; data?: string }[]
  expect(bar!.values).toEqual([0, 0, 7, 8])
  expect(text!.data).toBe(' X')
})

test('a track with nothing to draw says so', () => {
  expect(() => expandSpec({ columnTracks: [{ name: 'empty' }] })).toThrow(
    /"empty" has no values, data or arcs/,
  )
})

test('a residue highlight is labeled with the letter at that position', () => {
  const model = stateModelFactory().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    ...expandSpec({
      query: 's1',
      msa: '>s1\nA-CDE\n>s2\nABCDE\n',
      highlights: [3, '2 {residue} at {position}'],
    }),
  })
  // residue 3 of s1 is D, which the gap puts in column 4
  expect(model.resolvedHighlights.map(h => h.label)).toEqual(['D3', 'C at 2'])
})

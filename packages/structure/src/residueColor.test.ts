// @vitest-environment jsdom
import { MSAModelF } from 'react-msaview'
import { expect, test } from 'vitest'

import {
  conservationRamp,
  cssHex,
  paintableTracks,
  residueColor,
} from './paint.ts'

function makeModel(tree?: string) {
  const model = MSAModelF().create({
    id: 'residue-color-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: {
      msa: '>a\nMKAANSE\n>b\nMKA-NSE\n>c\nMKAANSE',
      ...(tree ? { tree } : {}),
    },
  })
  model.setWidth(800)
  model.setColumnTracks([
    {
      id: 'divergence',
      name: 'Divergence',
      kind: 'bar',
      row: 'a',
      values: [0, 0, 0, 2, 4, 0, 0],
      encoding: { y: { scale: { domainMax: 4 } } },
    },
    {
      id: 'pocket',
      name: 'Pocket',
      kind: 'text',
      data: '  Pp   ',
      encoding: {
        color: { scale: { domain: ['P'], range: ['rgb(213, 94, 0)'] } },
      },
    },
    { id: 'plain', name: 'Plain', kind: 'text', data: 'abcdefg' },
  ])
  return model
}

test('a bar track paints each residue through the ramp at its column', () => {
  const colorOf = residueColor(makeModel(), 'track:divergence')
  expect(colorOf('a', 1)).toBe(conservationRamp[0])
  expect(colorOf('a', 4)).toBe(conservationRamp[2])
  expect(colorOf('a', 5)).toBe(conservationRamp.at(-1))
  expect(colorOf('b', 4)).toBe(conservationRamp.at(-1))
})

test("a column where the track's own row has a gap takes no color", () => {
  const model = makeModel()
  model.setColumnTracks([
    { id: 'gapped', name: 'Gapped', kind: 'bar', row: 'b', values: [1, 1, 1] },
  ])
  const colorOf = residueColor(model, 'track:gapped')
  expect(colorOf('a', 3)).toBe(conservationRamp.at(-1))
  expect(colorOf('a', 4)).toBeUndefined()
})

test('a track row inside a collapsed clade still blanks its gap columns', () => {
  const model = makeModel('((b:1,c:1):1,a:1);')
  model.setColumnTracks([
    { id: 'gapped', name: 'Gapped', kind: 'bar', row: 'b', values: [1, 1, 1] },
  ])
  model.toggleCollapsed(model.root.children![0]!.data.id)
  expect(model.columns.has('b')).toBe(false)
  const colorOf = residueColor(model, 'track:gapped')
  expect(colorOf('a', 3)).toBe(conservationRamp.at(-1))
  expect(colorOf('a', 4)).toBeUndefined()
})

test('a text track paints the letters its scale names, in either case', () => {
  const colorOf = residueColor(makeModel(), 'track:pocket')
  expect(colorOf('a', 3)).toBe('#d55e00')
  expect(colorOf('a', 4)).toBe('#d55e00')
  expect(colorOf('b', 3)).toBe('#d55e00')
  expect(colorOf('a', 1)).toBeUndefined()
})

test('a track the alignment lacks gives no residue a color', () => {
  expect(residueColor(makeModel(), 'track:gone')('a', 1)).toBeUndefined()
})

test('only bar tracks and colored text tracks are paintable', () => {
  expect(paintableTracks(makeModel()).map(t => t.id)).toEqual([
    'divergence',
    'pocket',
  ])
})

test.each([
  ['rgba(255,140,0,0.15)', '#ff8c00'],
  ['#E69F00', '#e69f00'],
  ['teal', '#008080'],
  ['no such color', undefined],
  ['transparent', undefined],
  [undefined, undefined],
])('cssHex(%s) is %s', (css, hex) => {
  expect(cssHex(css)).toBe(hex)
})

import { expect, test } from 'vitest'

import { createPaletteMap } from './createPaletteMap.ts'
import { namedPalettes } from './ggplotPalettes.ts'
import { compareGroupKeys } from './groupKeys.ts'
import {
  declarationKey,
  letterColors,
  readColor,
  readColumnTrack,
  resolveScale,
  resolveShared,
} from './scales.ts'

import type { ColorChannel } from './scales.ts'

const set1 = namedPalettes.set1!

test('a spec with no range takes the ggplot colors of its size', () => {
  const { colorOf, legend, kind } = resolveScale(undefined, ['a', 'b', 'a'])
  expect(kind).toBe('categorical')
  expect(colorOf('a')).toBe('#F8766D')
  expect(colorOf('b')).toBe('#00BFC4')
  expect(legend).toEqual([
    { id: 'a', label: 'a', color: '#F8766D' },
    { id: 'b', label: 'b', color: '#00BFC4' },
  ])
})

test('a scheme colors the domain in its own order', () => {
  const { colorOf } = resolveScale({ scheme: 'set1' }, ['clade B', 'clade A'])
  expect(colorOf('clade A')).toBe(set1[0])
  expect(colorOf('clade B')).toBe(set1[1])
})

test('okabeIto and tableau10 read as the palettes they alias', () => {
  expect(resolveScale({ scheme: 'okabeIto' }, ['a']).colorOf('a')).toBe(
    namedPalettes.okabeito![0],
  )
  expect(resolveScale({ scheme: 'tableau10' }, ['a']).colorOf('a')).toBe(
    namedPalettes.tableau![0],
  )
})

test('an unknown palette name falls back to the ggplot colors', () => {
  const { colorOf } = resolveScale({ scheme: 'brewer-nine' }, ['a', 'b'])
  expect(colorOf('a')).toBe('#F8766D')
})

test('a domain past a named palette gets a hue of its own per value', () => {
  const values = Array.from({ length: 12 }, (_, i) => `v${i}`)
  const { colorOf, legend } = resolveScale({ scheme: 'dark2' }, values)
  expect(new Set(values.map(colorOf)).size).toBe(12)
  expect(legend).toHaveLength(12)
})

test('domain and range color the values they name and no others', () => {
  const { colorOf, legend } = resolveScale(
    { domain: ['19B', '20A'], range: ['#e41a1c', '#377eb8'] },
    ['19B', '21K'],
  )
  expect(colorOf('19B')).toBe('#e41a1c')
  expect(colorOf('21K')).toBeUndefined()
  // 20A is listed and absent from the data, so no legend entry stands for
  // rows that are not there
  expect(legend).toEqual([{ id: '19B', label: '19B', color: '#e41a1c' }])
})

test('a range list colors as many values as it holds', () => {
  const { colorOf } = resolveScale({ range: ['#111111', '#222222'] }, [
    'c',
    'a',
    'b',
  ])
  expect(['a', 'b', 'c'].map(colorOf)).toEqual([
    '#111111',
    '#222222',
    undefined,
  ])
})

test('an earlier comma-separated range reads as a list of colors', () => {
  const { scale } = readColor({ field: 'f', range: '#111111, rgb(0,0,0)' })
  expect(scale).toEqual({ range: ['#111111', 'rgb(0,0,0)'] })
  const { colorOf } = resolveScale(scale, ['a', 'b'])
  expect(colorOf('a')).toBe('#111111')
  expect(colorOf('b')).toBe('rgb(0,0,0)')
})

test('domain lists values first in its order, and spends the scheme from there', () => {
  const { colorOf, legend } = resolveScale(
    { domain: ['zeta', 'alpha'], scheme: 'set1' },
    ['alpha', 'beta', 'zeta'],
  )
  expect(legend.map(e => e.id)).toEqual(['zeta', 'alpha', 'beta'])
  expect(colorOf('zeta')).toBe(set1[0])
  expect(colorOf('beta')).toBe(set1[2])
})

test('the domain sorts naturally, so 2 comes before 10', () => {
  const values = ['chr10', '10', 'H5N8', '2.3.4.4b', 'chr2', '2', 'H5N1']
  expect(resolveScale(undefined, values).legend.map(e => e.id)).toEqual([
    '2',
    '10',
    '2.3.4.4b',
    'H5N1',
    'H5N8',
    'chr2',
    'chr10',
  ])
  expect(['2.3.4.4b', '2.3.2.1a'].toSorted(compareGroupKeys)).toEqual([
    '2.3.2.1a',
    '2.3.4.4b',
  ])
})

test('the domain sorts, so row order does not move a color', () => {
  const forward = resolveScale(undefined, ['x', 'y', 'z'])
  const shuffled = resolveScale(undefined, ['z', 'x', 'y'])
  expect(shuffled.colorOf('z')).toBe(forward.colorOf('z'))
})

test('an empty field gives an empty legend and no colors', () => {
  const { colorOf, legend } = resolveScale({ scheme: 'set1' }, [])
  expect(legend).toEqual([])
  expect(colorOf('anything')).toBeUndefined()
  expect(colorOf('constructor')).toBeUndefined()
})

test('resolving two fields apart colors a shared value two ways', () => {
  const pb2 = resolveScale({ scheme: 'set1' }, ['am2.2', 'am4'])
  const pb1 = resolveScale({ scheme: 'set1' }, ['am4', 'eu1'])
  expect(pb2.colorOf('am4')).not.toBe(pb1.colorOf('am4'))
})

test('one declaration resolves once over both fields', () => {
  const spec = {
    scale: { scheme: 'set1' },
    legend: { title: 'segment lineage' },
  }
  const uses = [
    { spec, field: 'PB2', table: 'rows' as const, values: ['am2.2', 'am4'] },
    { spec, field: 'PB1', table: 'rows' as const, values: ['am4', 'eu1'] },
  ]
  const scales = resolveShared(uses)
  expect(scales.size).toBe(1)
  const [scale] = scales.values()
  expect(scale!.title).toBe('segment lineage')
  expect(scale!.legend.map(e => [e.id, e.color])).toEqual([
    ['am2.2', set1[0]],
    ['am4', set1[1]],
    ['eu1', set1[2]],
  ])
})

test('a title stands in for the field in the declaration', () => {
  const key = (c: ColorChannel) =>
    declarationKey({ spec: c, field: c.field, table: 'rows' })
  const set1Scale = { scheme: 'set1' }
  expect(key({ field: 'PB2', scale: set1Scale })).not.toBe(
    key({ field: 'PB1', scale: set1Scale }),
  )
  expect(key({ field: 'PB2', scale: set1Scale, legend: { title: 't' } })).toBe(
    key({
      field: 'PB1',
      scale: { type: 'ordinal', scheme: 'set1' },
      legend: { title: 't' },
    }),
  )
})

test('palette reads as scheme, map as domain and range, legend as title', () => {
  expect(readColor({ field: 'f', scale: { palette: 'set1' } })).toEqual({
    field: 'f',
    scale: { scheme: 'set1' },
  })
  expect(
    readColor({
      field: 'f',
      scale: { map: { a: '#111111', b: '#222222' } },
    }),
  ).toEqual({
    field: 'f',
    scale: { domain: ['a', 'b'], range: ['#111111', '#222222'] },
  })
  expect(readColor({ field: 'f', legend: 'lineage' })).toEqual({
    field: 'f',
    legend: { title: 'lineage' },
  })
  expect(readColor({ field: 'f', scale: {} })).toEqual({
    field: 'f',
  })
})

test('the flat members nest under scale and legend', () => {
  expect(
    readColor({
      field: 'f',
      scale: 'categorical',
      domain: ['a'],
      range: 'set1',
      title: 'lineage',
    }),
  ).toEqual({
    field: 'f',
    scale: { domain: ['a'], scheme: 'set1' },
    legend: { title: 'lineage' },
  })
  expect(readColor({ field: 'f', range: ['#111111'] })).toEqual({
    field: 'f',
    scale: { range: ['#111111'] },
  })
})

test('a color object in the current spelling reads unchanged', () => {
  const current = {
    field: 'f',
    scale: { type: 'ordinal' as const, domain: ['a'], scheme: 'set1' },
    legend: { title: 'lineage' },
  }
  expect(readColor(current)).toEqual(current)
})

test('a column track reads colors as encoding.color and max as domainMax', () => {
  expect(
    readColumnTrack({
      id: 't',
      name: 'T',
      kind: 'text',
      data: '12',
      colors: { 1: '#111111' },
      max: 2,
    }),
  ).toEqual({
    id: 't',
    name: 'T',
    kind: 'text',
    data: '12',
    encoding: {
      color: { scale: { domain: ['1'], range: ['#111111'] } },
      y: { scale: { domainMax: 2 } },
    },
  })
})

test('a column track in the new spelling wins over its earlier members', () => {
  expect(
    readColumnTrack({
      id: 't',
      name: 'T',
      kind: 'bar',
      values: [1],
      max: 2,
      scales: { y: { domainMax: 3 } },
      encoding: { y: { scale: { domainMax: 4 } } },
    }).encoding,
  ).toEqual({ y: { scale: { domainMax: 4 } } })
})

test('a scheme object reads in either spelling', () => {
  const table = { K: '#1f77b4', R: '#1f77b4' }
  expect(letterColors({ map: table })).toEqual(table)
  expect(
    letterColors({ domain: ['K', 'R'], range: ['#1f77b4', '#1f77b4'] }),
  ).toEqual(table)
})

test('createPaletteMap without a palette keeps the ggplot ramp', () => {
  expect(createPaletteMap(['a', 'b', 'c'])).toEqual({
    a: '#F8766D',
    b: '#00BA38',
    c: '#619CFF',
  })
})

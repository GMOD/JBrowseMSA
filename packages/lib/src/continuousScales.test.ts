import { expect, test } from 'vitest'

import { quantileExtent, rampMidT } from './colorRamp.ts'
import { MAX_LEGEND_ITEMS, legendEntries } from './legendSpec.ts'
import { colorProblems } from './scaleProblems.ts'
import {
  missingColor,
  notANumberLabel,
  resolveScale,
  resolveShared,
} from './scales.ts'

const viridisLow = '#440154'
const viridisHigh = '#fde725'

test('a linear scale with no scheme samples viridis between the extremes', () => {
  const { kind, colorOf, items } = resolveScale({ type: 'linear' }, [
    '2019',
    '2021',
    '2023',
  ])
  expect(kind).toBe('linear')
  expect(colorOf('2019')).toBe(viridisLow)
  expect(colorOf('2023')).toBe(viridisHigh)
  expect(items).toHaveLength(1)
  expect(items[0]!.gradient).toMatchObject({
    minLabel: '2019',
    maxLabel: '2023',
  })
  expect(items[0]!.gradient!.stops[0]).toEqual({ offset: 0, color: viridisLow })
})

test('a pinned end draws a value past it in the end color, and the legend marks it', () => {
  const { colorOf, items } = resolveScale(
    { type: 'linear', domainMin: 2019, domainMax: 2023 },
    ['1977', '2020', '2024'],
  )
  expect(colorOf('1977')).toBe(viridisLow)
  expect(colorOf('2024')).toBe(viridisHigh)
  expect(items[0]!.gradient).toMatchObject({
    minLabel: '≤2019',
    maxLabel: '≥2023',
  })
})

test('reverse turns the ramp round', () => {
  const { colorOf } = resolveScale({ type: 'linear', reverse: true }, [
    '0',
    '1',
  ])
  expect(colorOf('0')).toBe(viridisHigh)
})

test('a named scheme and a range of colors each make the ramp', () => {
  const reds = resolveScale({ type: 'linear', scheme: 'reds' }, ['0', '1'])
  expect(reds.colorOf('0')).toBe('#fff5f0')
  expect(reds.colorOf('1')).toBe('#67000d')
  const own = resolveScale({ type: 'linear', range: ['white', 'black'] }, [
    '0',
    '10',
  ])
  expect(own.colorOf('5')).toBe('#808080')
})

test('domainMid puts the middle color on its value', () => {
  const { colorOf } = resolveScale(
    {
      type: 'linear',
      scheme: 'redblue',
      domainMin: 0,
      domainMax: 4,
      domainMid: 1,
    },
    ['0', '4'],
  )
  expect(colorOf('1')).toBe('#f7f7f7')
  expect(rampMidT(0.25, 0.25)).toBe(0.5)
})

test('a log scale spaces the ramp by orders of magnitude', () => {
  const { colorOf } = resolveScale({ type: 'log', scheme: 'blues' }, [
    '1',
    '10',
    '100',
  ])
  const linear = resolveScale({ type: 'linear', scheme: 'blues' }, [
    '1',
    '10',
    '100',
  ])
  expect(colorOf('1')).toBe('#f7fbff')
  expect(colorOf('100')).toBe('#08306b')
  expect(colorOf('10')).not.toBe(linear.colorOf('10'))
})

test('domainQuantile clips an outlier by nearest rank', () => {
  const values = [...Array.from({ length: 99 }, (_, i) => i + 1), 10000]
  expect(quantileExtent(values, 0.99)).toEqual([2, 99])
  expect(quantileExtent(values)).toEqual([1, 10000])
  const { colorOf, items } = resolveScale(
    { type: 'linear', domainQuantile: 0.99 },
    values.map(String),
  )
  expect(colorOf('99')).toBe(viridisHigh)
  expect(items[0]!.gradient!.maxLabel).toBe('≥99')
})

test('a value that is no number draws grey under its own legend row', () => {
  const { colorOf, items } = resolveScale({ type: 'linear' }, ['1', 'NA', '3'])
  expect(colorOf('NA')).toBe(missingColor)
  expect(items.at(-1)).toEqual({
    value: '',
    label: notANumberLabel,
    color: missingColor,
  })
})

test('missingLabel names the grey row, which then takes records with no value', () => {
  const { colorOf, items } = resolveScale(
    { type: 'linear' },
    ['1', undefined],
    {
      missingLabel: 'undated',
    },
  )
  expect(colorOf(undefined)).toBe(missingColor)
  expect(items.at(-1)).toEqual({
    value: '',
    label: 'undated',
    color: missingColor,
  })
  expect(
    resolveScale({ type: 'linear' }, ['1', undefined]).colorOf(undefined),
  ).toBeUndefined()
})

test('a threshold scale colors each interval and lists every one', () => {
  const { kind, colorOf, items } = resolveScale(
    {
      type: 'threshold',
      domain: [50, 70, 90],
      range: ['#ff7d45', '#ffdb13', '#65cbf3', '#0053d6'],
    },
    ['95', '30'],
    { labels: ['Very low', 'Low', 'Confident', 'Very high'] },
  )
  expect(kind).toBe('threshold')
  expect(['30', '50', '69.9', '70', '90', '99'].map(colorOf)).toEqual([
    '#ff7d45',
    '#ffdb13',
    '#ffdb13',
    '#65cbf3',
    '#0053d6',
    '#0053d6',
  ])
  expect(items.map(i => [i.value, i.label])).toEqual([
    ['< 50', 'Very low'],
    ['50 – 70', 'Low'],
    ['70 – 90', 'Confident'],
    ['≥ 90', 'Very high'],
  ])
})

test('a threshold scale with no range samples its scheme per interval', () => {
  const { items } = resolveScale({ type: 'threshold', domain: ['1'] }, ['0'])
  expect(items.map(i => i.color)).toEqual([viridisLow, viridisHigh])
})

test('an ordinal scale over numbers notes the member that makes a ramp', () => {
  expect(resolveScale(undefined, ['2019', '2020']).note).toContain(
    'scale: {type: "linear"}',
  )
  expect(
    resolveScale({ type: 'ordinal' }, ['2019', '2020']).note,
  ).toBeUndefined()
  expect(resolveScale(undefined, ['2019', 'NA']).note).toBeUndefined()
})

test('legend.labels names the domain values of an ordinal scale', () => {
  const { items } = resolveScale(
    { domain: ['1', '-1'], range: ['tomato', 'cornflowerblue'] },
    ['-1', '1'],
    { labels: ['forward', 'reverse'] },
  )
  expect(items.map(i => i.label)).toEqual(['forward', 'reverse'])
})

const yearUse = (field: string, values: string[], domainMax?: number) => ({
  spec: { scale: { type: 'linear' as const, domainMin: 2000, domainMax } },
  field,
  table: 'rows' as const,
  values,
})

test('a ramp pinned at both ends is one scale across fields', () => {
  const shared = resolveShared([
    yearUse('collected', ['2001', '2010'], 2020),
    yearUse('sequenced', ['2015', '2020'], 2020),
  ])
  expect(shared.size).toBe(1)
})

test('a ramp with an open end follows each field on its own', () => {
  const apart = resolveShared([
    yearUse('collected', ['2001', '2010']),
    yearUse('sequenced', ['2015', '2020']),
  ])
  expect(apart.size).toBe(2)
  const [collected, sequenced] = apart.values()
  expect(collected!.colorOf('2010')).toBe(viridisHigh)
  expect(sequenced!.colorOf('2020')).toBe(viridisHigh)
})

test('a section past twenty rows lists twenty and counts the rest', () => {
  const values = Array.from({ length: 25 }, (_, i) => `v${i}`)
  const entries = legendEntries({
    sections: [
      { id: 's', title: 'many', items: resolveScale(undefined, values).items },
    ],
  })
  expect(entries).toHaveLength(MAX_LEGEND_ITEMS + 1)
  expect(entries.at(-1)).toMatchObject({ kind: 'note', label: '+5 more' })
})

test('a lone ramp carries its title on the bar', () => {
  const { items } = resolveScale({ type: 'linear' }, ['1', '2'])
  const [entry] = legendEntries({
    sections: [{ id: 'year', title: 'year', items }],
  })
  expect(entry).toMatchObject({ kind: 'gradient', label: 'year' })
})

test('each combination of members no one member can refuse is a problem', () => {
  const rules = (spec: Parameters<typeof colorProblems>[0]) =>
    colorProblems(spec).map(p => p.rule)
  expect(
    rules({ scale: { type: 'linear', domainMin: 5, domainMax: 1 } }),
  ).toEqual(['domain-ends'])
  expect(rules({ scale: { type: 'threshold', domain: [70, 50] } })).toEqual([
    'threshold-cuts',
  ])
  expect(
    rules({ scale: { type: 'threshold', domain: [50], range: ['red'] } }),
  ).toEqual(['threshold-range'])
  expect(rules({ scale: { type: 'linear', domainQuantile: 99 } })).toEqual([
    'domain-quantile',
  ])
  expect(
    rules({ scale: { domain: ['a', 'b'] }, legend: { labels: ['A'] } }),
  ).toEqual(['labels-domain'])
  expect(rules({ scale: { type: 'linear', scheme: 'rainbow' } })).toEqual([
    'unknown-scheme',
  ])
  expect(rules({ scale: { scheme: 'viridis' } })).toEqual(['unknown-scheme'])
  expect(
    rules({
      scale: { type: 'threshold', domain: [50, 70, 90] },
      legend: { labels: ['a', 'b', 'c', 'd'] },
    }),
  ).toEqual([])
})

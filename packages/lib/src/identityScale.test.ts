// An identity scale reads each value as the color it names, the way a GFF
// `color=` attribute colors its own feature (jbrowse-components' ADR-243).
import { expect, test } from 'vitest'

import { colorProblems } from './scaleProblems.ts'
import { resolveScale, resolveShared } from './scales.ts'
import { createTestModel } from './svgTestUtil.ts'

test('each value paints as the color it names', () => {
  const { colorOf, kind } = resolveScale({ type: 'identity' }, [
    '#e41a1c',
    'steelblue',
  ])
  expect(kind).toBe('identity')
  expect(colorOf('#e41a1c')).toBe('#e41a1c')
  expect(colorOf('steelblue')).toBe('steelblue')
  expect(colorOf(' 255,0,0 ')).toBe('rgb(255,0,0)')
  expect(colorOf(undefined)).toBeUndefined()
})

test('the legend lists the colors domain names that the values hold, under labels', () => {
  const { items } = resolveScale(
    { type: 'identity', domain: ['#e41a1c', '#377eb8', '#4daf4a'] },
    ['#377eb8', '#e41a1c', '#ffff00'],
    { labels: ['pathogenic', 'benign', 'uncertain'] },
  )
  expect(items).toEqual([
    { value: '#e41a1c', label: 'pathogenic', color: '#e41a1c' },
    { value: '#377eb8', label: 'benign', color: '#377eb8' },
  ])
})

test('with no domain the legend lists nothing', () => {
  expect(resolveScale({ type: 'identity' }, ['#e41a1c']).items).toEqual([])
})

test('a missingLabel names the rows with no color, in grey', () => {
  const { colorOf, items } = resolveScale(
    { type: 'identity', domain: ['red'] },
    ['red', undefined],
    { missingLabel: 'unscored' },
  )
  expect(colorOf(undefined)).toBe('#d9d9d9')
  expect(items.at(-1)).toEqual({
    value: '',
    label: 'unscored',
    color: '#d9d9d9',
  })
})

test('the feature legend lists only the colors the shown features carry', () => {
  const [scale] = resolveShared([
    {
      spec: { scale: { type: 'identity', domain: ['red', 'blue'] } },
      field: 'color',
      table: 'features',
      values: ['red', 'blue'],
      shown: ['blue'],
    },
  ]).values()
  expect(scale!.items.map(i => i.value)).toEqual(['blue'])
})

test('a GFF color= reads through an identity scale into a legend that names it', () => {
  const model = createTestModel({
    id: 'identity-gff-test',
    data: { msa: '>seq1\nACDEFGHIKL\n>seq2\nACDEFGHIKL' },
    encodings: [
      {
        channel: 'featureFill',
        field: 'color',
        scale: { type: 'identity', domain: ['255,0,0', '#0000ff'] },
        legend: { labels: ['pathogenic', 'benign'] },
      },
    ],
  })
  model.applyGFFText(
    [
      '##gff-version 3',
      'seq1\tsrc\tsite\t1\t3\t.\t.\t.\tName=a;color=255,0,0',
      'seq2\tsrc\tsite\t1\t3\t.\t.\t.\tName=b;color=#0000ff',
    ].join('\n'),
  )
  expect(model.legends[0]!.items).toEqual([
    { value: 'rgb(255,0,0)', label: 'pathogenic', color: 'rgb(255,0,0)' },
    { value: '#0000ff', label: 'benign', color: '#0000ff' },
  ])

  model.toggleLegendItem(model.legends[0]!.hides!, 'rgb(255,0,0)')
  expect(model.filteredAnnotations.map(a => a.accession)).toEqual(['b'])
})

test('a range, a scheme or labels past the domain are problems', () => {
  const rules = (spec: Parameters<typeof colorProblems>[0]) =>
    colorProblems(spec).map(p => p.rule)
  expect(rules({ scale: { type: 'identity', range: ['red'] } })).toEqual([
    'identity-colors',
  ])
  expect(rules({ scale: { type: 'identity', scheme: 'set1' } })).toEqual([
    'identity-colors',
  ])
  expect(
    rules({
      scale: { type: 'identity', domain: ['red'] },
      legend: { labels: ['hot', 'cold'] },
    }),
  ).toEqual(['labels-domain'])
  expect(rules({ scale: { type: 'identity', domain: ['red'] } })).toEqual([])
})

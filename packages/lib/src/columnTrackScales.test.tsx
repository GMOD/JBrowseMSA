// @vitest-environment jsdom
// Column tracks reading a color object and a value scale: a bar colored by its
// value, a strip of one cell per column, a text track and an arc track through
// the shared scales, the legends they list and the problems they report.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

import type { ColorSpec } from './scales.ts'
import type { ColumnTrackSpec } from './types.ts'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

const msa = '>s1\nACGT\n>s2\nACGT\n'
const red = '#d7301f'
const blue = '#2c7fb8'
const colWidth = 20

const dndsColor: ColorSpec = {
  scale: { type: 'threshold', domain: [1], range: [blue, red] },
  legend: { title: 'dN/dS' },
}

function makeModel(columnTracks: ColumnTrackSpec[]) {
  const model = MSAModelF().create({
    id: 'column-track-scales-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    colWidth,
    data: { msa },
    columnTracks,
  })
  model.setWidth(1000)
  return model
}

function rectsFilled(svg: string, fill: string) {
  return [...svg.matchAll(/<rect ([^>]*)\/?>/g)]
    .map(m => m[1]!)
    .filter(attrs => attrs.includes(`fill="${fill}"`))
    .map(attrs => Number(/x="([\d.-]+)"/.exec(attrs)?.[1]))
}

test('a threshold at 1 colors a bar red above and blue below', () => {
  const model = makeModel([
    {
      id: 'dnds',
      name: 'dN/dS',
      kind: 'bar',
      values: [0.2, 1, 3, 0.9],
      encoding: { color: dndsColor, y: { scale: { domainMax: 5 } } },
    },
  ])
  expect(model.columnTrackColors.get('dnds')?.columns).toEqual([
    blue,
    red,
    red,
    blue,
  ])
  expect(model.legends).toHaveLength(1)
  expect(model.legends[0]).toMatchObject({
    title: 'dN/dS',
    items: [
      { label: '< 1', color: blue },
      { label: '≥ 1', color: red },
    ],
  })
})

test('encoding.color.value is one color, and color is its shorthand', () => {
  const model = makeModel([
    {
      id: 'a',
      name: 'A',
      kind: 'bar',
      values: [1, 1],
      encoding: { color: { value: red } },
    },
    { id: 'b', name: 'B', kind: 'bar', values: [1, 1], color: blue },
    {
      id: 'c',
      name: 'C',
      kind: 'bar',
      values: [1, 1],
      color: blue,
      encoding: { color: { value: red } },
    },
  ])
  const columns = (id: string) => model.columnTrackColors.get(id)?.columns
  expect(columns('a')).toEqual([red, red])
  expect(columns('b')).toEqual([blue, blue])
  expect(columns('c')).toEqual([red, red])
  expect(model.colorRecords).toEqual([])
  expect(model.legends).toEqual([])
})

test('a bar with neither color nor encoding.color keeps the default gray', () => {
  const model = makeModel([{ id: 'a', name: 'A', kind: 'bar', values: [1] }])
  expect(model.columnTrackColors.has('a')).toBe(false)
  expect(model.columnTrackModel(model.columnTracks[0]!).model.barColor).toBe(
    undefined,
  )
})

test('a log value scale follows the positive values, and domainMin lifts the floor', () => {
  const model = makeModel([
    {
      id: 'log',
      name: 'Log',
      kind: 'bar',
      values: [1, 10, 100, 0],
      encoding: { y: { scale: { type: 'log' } } },
    },
    {
      id: 'floor',
      name: 'Floor',
      kind: 'bar',
      values: [1, 2, 3, 4],
      encoding: { y: { scale: { domainMin: 2, domainMax: 4 } } },
    },
  ])
  expect(model.columnTrackContent.get('log')?.values).toEqual([0, 0.5, 1, 0])
  expect(model.columnTrackContent.get('floor')?.values).toEqual([0, 0, 0.5, 1])
})

test('a strip colors each column through its scale, and draws nothing where a value is missing', () => {
  const model = makeModel([
    {
      id: 'plddt',
      name: 'pLDDT',
      kind: 'strip',
      values: [95, 80, 60, Number.NaN],
      encoding: {
        color: {
          scale: {
            type: 'threshold',
            domain: [50, 70, 90],
            range: ['#ff7d45', '#ffdb13', '#65cbf3', '#0053d6'],
          },
        },
      },
    },
  ])
  expect(model.columnTrackColors.get('plddt')?.columns).toEqual([
    '#0053d6',
    '#65cbf3',
    '#ffdb13',
    undefined,
  ])
  expect(model.legends[0]?.title).toBe('pLDDT')
  expect(model.legends[0]?.items).toHaveLength(4)
  model.toggleTrack('plddt')
  expect(model.legends).toEqual([])
})

test('a strip with no color reads its values through the default scale', () => {
  const model = makeModel([
    { id: 's', name: 'Disorder', kind: 'strip', values: [0, 1, 1, 0] },
  ])
  expect(model.colorRecords.map(r => r.record)).toEqual([
    'columnTracks[0].encoding.color',
  ])
  const [a, b] = model.columnTrackColors.get('s')!.columns!
  expect(a).toBeDefined()
  expect(b).not.toBe(a)
  expect(model.legends[0]?.note).toContain('scale: {type: "linear"}')
})

test('a bar and a strip declaring one scale and title list one legend', () => {
  const model = makeModel([
    {
      id: 'bar',
      name: 'dN/dS bars',
      kind: 'bar',
      values: [0.5, 2],
      encoding: { color: dndsColor },
    },
    {
      id: 'strip',
      name: 'dN/dS strip',
      kind: 'strip',
      values: [3, 0.1],
      encoding: { color: dndsColor },
    },
  ])
  expect(model.legends.map(l => l.title)).toEqual(['dN/dS'])
  expect(model.columnTrackColors.get('strip')?.columns).toEqual([red, blue])
})

test('a text track lists the legend of the scale its characters read', () => {
  const model = makeModel([
    {
      id: 'ss',
      name: 'Secondary structure',
      kind: 'text',
      data: 'hh e',
      encoding: {
        color: { scale: { domain: ['H', 'E'], range: [red, blue] } },
      },
    },
  ])
  expect(model.columnTrackColors.get('ss')?.letters).toEqual({
    H: red,
    E: blue,
  })
  expect(model.legends[0]).toMatchObject({
    title: 'Secondary structure',
    items: [
      { value: 'H', color: red },
      { value: 'E', color: blue },
    ],
  })
})

test("an arc track's color reads each arc's value, and an arc's own color wins", async () => {
  const model = makeModel([
    {
      id: 'contacts',
      name: 'Contacts',
      kind: 'arc',
      arcs: [
        { start: 1, end: 3, value: 0.9 },
        { start: 2, end: 4, value: 0.2 },
        { start: 1, end: 4, value: 0.9, color: '#00ff00' },
      ],
      encoding: {
        color: {
          scale: { type: 'threshold', domain: [0.5], range: [blue, red] },
          legend: { title: 'contact probability' },
        },
      },
    },
  ])
  expect(model.legends[0]?.title).toBe('contact probability')
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
  expect(svg).toMatch(new RegExp(`<path [^>]*stroke="${red}"`))
  expect(svg).toMatch(new RegExp(`<path [^>]*stroke="${blue}"`))
  expect(svg).toMatch(/<path [^>]*stroke="#00ff00"/)
})

test('a features track fill takes one color as value, ahead of the color shorthand', () => {
  const model = makeModel([
    {
      id: 'spans',
      name: 'Spans',
      kind: 'features',
      features: [
        { start: 1, end: 2, type: 'helix' },
        { start: 3, end: 4, type: 'strand', color: '#00ff00' },
      ],
      color: blue,
      encoding: { fill: { value: red } },
    },
  ])
  const fills = [...model.featureTrackScales.get('spans')!.colors.values()]
  expect(fills.map(c => c.fill)).toEqual([red, '#00ff00'])
  expect(model.colorRecords).toEqual([])
  expect(model.legends).toEqual([])
})

test('a legend click hides a value on a bar, a strip, a text track and an arc track', async () => {
  const ordinal: ColorSpec = {
    scale: { domain: ['1', '2'], range: [red, blue] },
    legend: { title: 'class' },
  }
  const model = makeModel([
    {
      id: 'bar',
      name: 'Bar',
      kind: 'bar',
      values: [1, 2, 1, 2],
      encoding: { color: ordinal },
    },
    {
      id: 'strip',
      name: 'Strip',
      kind: 'strip',
      values: [2, 1, 2, 1],
      encoding: { color: ordinal },
    },
    {
      id: 'text',
      name: 'Text',
      kind: 'text',
      data: '1212',
      encoding: { color: ordinal },
    },
    {
      id: 'arcs',
      name: 'Arcs',
      kind: 'arc',
      arcs: [
        { start: 1, end: 3, value: 1 },
        { start: 2, end: 4, value: 2 },
      ],
      encoding: { color: ordinal },
    },
  ])
  const [section] = model.legends
  expect(model.legends).toHaveLength(1)
  model.toggleLegendItem(section!.hides!, '2')
  expect(model.legends[0]!.items.find(i => i.value === '2')?.hidden).toBe(true)

  const colors = (id: string) => model.columnTrackColors.get(id)
  expect(colors('bar')?.hiddenColumns).toEqual([false, true, false, true])
  expect(colors('strip')?.columns).toEqual([undefined, red, undefined, red])
  expect(colors('text')?.letters).toEqual({ 1: red })

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
  expect(svg).toMatch(new RegExp(`<path [^>]*stroke="${red}"`))
  expect(svg).not.toMatch(new RegExp(`<path [^>]*stroke="${blue}"`))
  expect(svg).not.toMatch(/<text[^>]*dominant-baseline="central"[^>]*>2</)
})

test("an identity scale on an arc track lists the arcs' own colors", () => {
  const model = makeModel([
    {
      id: 'contacts',
      name: 'Contacts',
      kind: 'arc',
      arcs: [
        { start: 1, end: 3, color: red },
        { start: 2, end: 4, color: blue },
      ],
      encoding: {
        color: {
          scale: { type: 'identity', domain: [red, blue] },
          legend: { title: 'Contact', labels: ['salt bridge', 'disulfide'] },
        },
      },
    },
  ])
  expect(model.legends[0]).toMatchObject({
    title: 'Contact',
    items: [
      { label: 'salt bridge', color: red },
      { label: 'disulfide', color: blue },
    ],
  })
  model.toggleLegendItem(model.legends[0]!.hides!, blue)
  const colors = model.columnTrackColors.get('contacts')!
  expect(colors.isHidden(blue)).toBe(true)
  expect(colors.colorOf(red)).toBe(red)
})

test('an identity scale on a strip paints each value that names a color', () => {
  const model = makeModel([
    {
      id: 's',
      name: 'S',
      kind: 'strip',
      values: [1, 2],
      encoding: { color: { scale: { type: 'identity' } } },
    },
  ])
  expect(model.columnTrackColors.get('s')?.columns).toEqual([
    undefined,
    undefined,
  ])
})

test("a bar track's value scale reports its problems under encoding.y", () => {
  const model = makeModel([
    {
      id: 'dnds',
      name: 'dN/dS',
      kind: 'bar',
      values: [1],
      encoding: { y: { scale: { domainMin: 2, domainMax: 1 } } },
    },
  ])
  expect(model.scaleProblems).toMatchObject([
    { record: 'columnTracks[0].encoding.y', rule: 'domain-ends' },
  ])
})

test('a column track scale reports its problems under its record', () => {
  const model = makeModel([
    {
      id: 'dnds',
      name: 'dN/dS',
      kind: 'bar',
      values: [1],
      encoding: {
        color: { scale: { type: 'threshold', domain: [1], range: [red] } },
      },
    },
  ])
  expect(model.scaleProblems).toMatchObject([
    { record: 'columnTracks[0].encoding.color', rule: 'threshold-range' },
  ])
})

test('the export draws a strip cell per column in its scale color', async () => {
  const model = makeModel([
    {
      id: 'dnds',
      name: 'dN/dS',
      kind: 'strip',
      values: [0.2, 2, 3, 0.4],
      encoding: { color: dndsColor },
    },
  ])
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
  expect(rectsFilled(svg, red)).toEqual(
    expect.arrayContaining([colWidth, colWidth * 2]),
  )
  expect(rectsFilled(svg, blue)).toEqual(
    expect.arrayContaining([0, colWidth * 3]),
  )
})

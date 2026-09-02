// @vitest-environment jsdom
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

import type { ColumnTrackSpec } from './types.ts'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

const msa = '>s1\nACGT\n>s2\nACGT\n'
const colWidth = 20
const barColor = '#123456'

function makeModel(columnTracks: ColumnTrackSpec[]) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    colWidth,
    data: { msa },
    columnTracks,
  })
  model.setWidth(1000)
  model.toggleTrack('conservation')
  return model
}

async function exportSvg(model: ReturnType<typeof makeModel>) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
}

function rectsFilled(svg: string, fill: string) {
  return [...svg.matchAll(/<rect ([^>]*)\/?>/g)]
    .map(m => m[1]!)
    .filter(attrs => attrs.includes(`fill="${fill}"`))
    .map(attrs => ({
      x: Number(/x="([\d.-]+)"/.exec(attrs)?.[1]),
      width: Number(/width="([\d.-]+)"/.exec(attrs)?.[1]),
      height: Number(/height="([\d.-]+)"/.exec(attrs)?.[1]),
    }))
}

test('a bar track from values exports one bar per column in its color', async () => {
  const model = makeModel([
    {
      id: 'dnds',
      name: 'dN/dS',
      kind: 'bar',
      values: [1, 0.5, 0, 0.25],
      color: barColor,
    },
  ])
  const bars = rectsFilled(await exportSvg(model), barColor).sort(
    (a, b) => a.x - b.x,
  )
  const trackHeight = model.conservationTrackHeight
  expect(bars.map(b => b.x)).toEqual([0, colWidth, colWidth * 2, colWidth * 3])
  expect(bars.map(b => b.height)).toEqual([
    trackHeight,
    trackHeight / 2,
    0,
    trackHeight / 4,
  ])
  expect(svgNamesTrack(await exportSvg(model))).toContain('dN/dS')
})

test('a text track from data exports its letters and its own colors', async () => {
  const model = makeModel([
    {
      id: 'frame',
      name: 'Codon frame',
      kind: 'text',
      data: '1231',
      colors: { 1: '#aaaaaa', 2: '#bbbbbb', 3: '#cccccc' },
    },
  ])
  const svg = await exportSvg(model)
  expect(
    rectsFilled(svg, '#aaaaaa')
      .map(b => b.x)
      .sort((a, b) => a - b),
  ).toEqual([0, colWidth * 3])
  expect(rectsFilled(svg, '#bbbbbb').map(b => b.x)).toEqual([colWidth])
  expect(svgNamesTrack(svg)).toContain('Codon frame')
})

test('a data track that is toggled off stays out of the export', async () => {
  const model = makeModel([
    { id: 'dnds', name: 'dN/dS', kind: 'bar', values: [1], color: barColor },
  ])
  model.toggleTrack('dnds')
  expect(rectsFilled(await exportSvg(model), barColor)).toEqual([])
})

function svgNamesTrack(svg: string) {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1])
}

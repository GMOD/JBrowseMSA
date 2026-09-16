// @vitest-environment jsdom
//
// model.legends drives two renderings: the on-screen overlay and the column the
// SVG export reserves on the right. The domain overlay is the only producer, so
// a second legend comes from a view that overrides the getter here.
import React from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import AnnotationLegend from './components/msa/AnnotationLegend.tsx'
import MSAModelF from './model.ts'
import { renderToStaticMarkup } from './renderToStaticMarkup.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { installSvgTestEnv } from './svgTestUtil.ts'

import type { MsaViewModel } from './model.ts'
import type { Legend } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

function modelWithLegends(legends: Legend[]): MsaViewModel {
  const model = MSAModelF()
    .views(() => ({
      get legends() {
        return legends
      },
    }))
    .create({
      type: 'MsaView',
      msaFormat: 'fasta',
      height: 400,
      id: 'legend-svg-test',
      data: { msa: '>seq1\nACDEFGHIKL\n>seq2\nACDE-GHIKL' },
    })
  model.setWidth(800)
  return model
}

function exportEntire(model: MsaViewModel) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
}

const lineage: Legend = {
  id: 'lineage',
  title: 'Lineage',
  entries: [
    { id: 'a', label: 'clade A', color: '#ff0000' },
    { id: 'b', label: 'clade B', color: '#00ff00' },
  ],
}

const segment: Legend = {
  id: 'segment',
  title: 'Segment',
  entries: [{ id: 'ha', label: 'HA', color: '#0000ff' }],
}

// the key box is 8px of padding above and below rows of 16px
const boxHeightOf = (svg: string) =>
  Number(/<rect[^>]*height="(\d+)"[^>]*rx="2"/.exec(svg)![1])
const pageWidthOf = (svg: string) =>
  Number(/<svg[^>]*width="(\d+)"/.exec(svg)![1])

test('both legends draw, each under its title', async () => {
  const svg = await exportEntire(modelWithLegends([lineage, segment]))

  for (const text of ['Lineage', 'clade A', 'clade B', 'Segment', 'HA']) {
    expect(svg).toContain(`>${text}</text>`)
  }
  for (const color of ['#ff0000', '#00ff00', '#0000ff']) {
    expect(svg).toContain(`fill="${color}"`)
  }
  expect(boxHeightOf(svg)).toBe(16 + 5 * 16)
})

test('a lone legend draws its entries and no title', async () => {
  const svg = await exportEntire(modelWithLegends([lineage]))

  expect(svg).toContain('>clade A</text>')
  expect(svg).not.toContain('Lineage')
  expect(boxHeightOf(svg)).toBe(16 + 2 * 16)
})

test('the reserved column measures across every legend', async () => {
  const wide: Legend = {
    ...segment,
    entries: [{ id: 'ha', label: 'HA'.repeat(30), color: '#0000ff' }],
  }
  const narrow = await exportEntire(modelWithLegends([lineage]))
  const widened = await exportEntire(modelWithLegends([lineage, wide]))

  expect(pageWidthOf(widened)).toBeGreaterThan(pageWidthOf(narrow))
})

test('no reserved column when the list is empty', async () => {
  const empty = await exportEntire(modelWithLegends([]))
  const one = await exportEntire(modelWithLegends([lineage]))

  expect(pageWidthOf(empty)).toBeLessThan(pageWidthOf(one))
})

test('the overlay stacks both legends, titled, in one box', () => {
  const html = renderToStaticMarkup(
    <AnnotationLegend model={modelWithLegends([lineage, segment])} />,
  )

  expect(html.match(/<div class="[^"]*MuiPaper-root/g)).toHaveLength(1)
  for (const text of ['Lineage', 'clade A', 'clade B', 'Segment', 'HA']) {
    expect(html).toContain(`>${text}</span>`)
  }
})

test('the overlay leaves a lone legend untitled', () => {
  const html = renderToStaticMarkup(
    <AnnotationLegend model={modelWithLegends([lineage])} />,
  )

  expect(html).toContain('>clade A</span>')
  expect(html).not.toContain('Lineage')
})

test('the overlay draws nothing for an empty list', () => {
  expect(
    renderToStaticMarkup(<AnnotationLegend model={modelWithLegends([])} />),
  ).toBe('')
})

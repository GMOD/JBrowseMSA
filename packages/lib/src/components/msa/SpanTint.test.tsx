// @vitest-environment jsdom
import React from 'react'

import { expect, test } from 'vitest'

import { renderToStaticMarkup } from '../../renderToStaticMarkup.ts'
import SpanTint from './SpanTint.tsx'

import type { Annotation } from '../../types.ts'
import type { SpanBand } from './drawFeatureSpans.ts'

const gene = (start: number, end: number, strand?: number): Annotation => ({
  id: `g${start}`,
  name: `g${start}`,
  description: '',
  accession: `g${start}`,
  start,
  end,
  strand,
})

test('only the hovered spans are tinted, each with its drawn shape', () => {
  const arrow = gene(1, 10, 1)
  const box = gene(20, 30)
  const other = gene(40, 50, -1)
  const bands: SpanBand[] = [arrow, box, other].map(annotation => ({
    annotation,
    lane: 0,
    laneCount: 1,
  }))
  const markup = renderToStaticMarkup(
    <SpanTint
      source={{
        rows: [{ y: 20, bands }],
        layout: { height: () => 10, top: () => 0, headLength: h => h },
        xOf: band => [band.annotation.start, band.annotation.end],
        colors: new Map(
          [arrow, box, other].map(a => [a, { fill: 'red', stroke: 'black' }]),
        ),
      }}
      annotations={[arrow, box]}
      width={100}
      height={20}
      transform="translate(0 0)"
    />,
  )
  expect(markup.match(/<polygon/g)).toHaveLength(1)
  expect(markup).toContain('<rect x="20" y="0" width="10" height="10"')
  expect(markup).not.toContain('red')
})

test('nothing hovered draws no overlay', () => {
  const markup = renderToStaticMarkup(
    <SpanTint
      source={{
        rows: [],
        layout: { height: () => 10, top: () => 0, headLength: h => h },
        xOf: () => [0, 1],
        colors: new Map(),
      }}
      annotations={[]}
      width={100}
      height={20}
      transform=""
    />,
  )
  expect(markup).toBe('')
})

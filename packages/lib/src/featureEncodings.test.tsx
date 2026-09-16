// @vitest-environment jsdom
//
// The two channels the feature table feeds: `featureFill` colors each span of
// the annotation overlay by a field of the features, and `featureLabel` names
// the field drawn inside a span. A feature carrying a GFF `color=` keeps that
// color whatever the scale says.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { MsaViewModel } from './model.ts'
import type { Encoding } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const row = 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKL'
const msa = `>seq1\n${row}\n>seq2\n${row}`

const gff = [
  '##gff-version 3',
  'seq1\tsrc\tprotein_match\t1\t10\t.\t.\t.\tName=kinase;group=enzyme',
  'seq2\tsrc\tprotein_match\t1\t10\t.\t.\t.\tName=myb;group=binder',
  'seq1\tsrc\tprotein_match\t21\t30\t.\t.\t.\tName=flagged;group=enzyme;color=255,0,0',
].join('\n')

function makeModel(encodings: Encoding[] = []) {
  const model = createTestModel({ id: 'feature-encodings-test', data: { msa } })
  model.applyGFFText(gff)
  model.setEncodings(encodings)
  return model
}

function fillOf(model: MsaViewModel, accession: string) {
  const annotation = model.filteredAnnotations.find(
    a => a.accession === accession,
  )!
  return model.featureColors.get(annotation)!.fill
}

// the scale sorts its domain, so binder takes the palette's first color
test('featureFill colors two features by the field they differ on', () => {
  const model = makeModel([{ channel: 'featureFill', field: 'group' }])

  expect(fillOf(model, 'myb')).toBe('#F8766D')
  expect(fillOf(model, 'kinase')).toBe('#00BFC4')
})

test('a feature carrying color= keeps its own color under the scale', () => {
  const scaled = makeModel([{ channel: 'featureFill', field: 'group' }])
  expect(fillOf(scaled, 'flagged')).toBe('rgb(255,0,0)')

  const plain = makeModel()
  expect(fillOf(plain, 'flagged')).toBe('rgb(255,0,0)')
})

test('the accession palette fills a span no encoding colors', () => {
  const model = makeModel()

  expect(fillOf(model, 'kinase')).toBe(model.fillPalette.kinase)
})

test('a value the map leaves out draws grey, not off the accession palette', () => {
  const model = makeModel([
    {
      channel: 'featureFill',
      field: 'group',
      scale: { map: { enzyme: '#e41a1c' } },
    },
  ])

  expect(fillOf(model, 'kinase')).toBe('#e41a1c')
  expect(fillOf(model, 'myb')).toBe('#d9d9d9')
})

test('the domain legend lists the values of the field featureFill reads', () => {
  const model = makeModel([
    {
      channel: 'featureFill',
      field: 'group',
      scale: { map: { enzyme: '#e41a1c', binder: '#377eb8' } },
    },
  ])

  expect(model.legends).toEqual([
    {
      id: 'domains',
      title: 'group',
      entries: [
        { id: 'enzyme', label: 'enzyme', color: '#e41a1c' },
        { id: 'binder', label: 'binder', color: '#377eb8' },
      ],
    },
  ])
})

test('the domain legend keeps the accessions when no encoding names the channel', () => {
  const { title, entries } = makeModel().legends[0]!

  expect(title).toBe('Domains')
  expect(entries.map(e => e.id)).toEqual(['kinase', 'myb', 'flagged'])
})

test('the export fills each span from the scale and labels it from the field', async () => {
  const model = makeModel([
    { channel: 'featureFill', field: 'group' },
    { channel: 'featureLabel', field: 'Name' },
  ])
  const band = model.domainBands.get('seq1')![0]!
  const x = band.startCol * model.colWidth
  const width = (band.endCol - band.startCol) * model.colWidth

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })

  const rects = svg.match(/<rect[^>]*>/g) ?? []
  expect(
    rects.some(
      r =>
        r.includes('fill="#00BFC4"') &&
        r.includes(`x="${x}"`) &&
        r.includes(`width="${width}"`),
    ),
  ).toBe(true)
  for (const label of ['kinase', 'myb', 'flagged']) {
    expect(svg).toContain(`>${label}</text>`)
  }
})

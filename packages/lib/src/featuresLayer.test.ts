// @vitest-environment jsdom
//
// The `features` layer takes the rows' features as JSON and draws them with the
// GFF's annotations, so a host that computes features never writes GFF text.
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { beforeAll, expect, test } from 'vitest'

import { featuresToAnnotations } from './featuresLayer.ts'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { Feature } from './types.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const row = 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKL'
const msa = `>seq1\n${row}\n>seq2\n${row}`

const features: Feature[] = [
  { row: 'seq1', start: 1, end: 10, name: 'kinase', group: 'enzyme' },
  { row: 'seq2', start: 1, end: 10, name: 'myb', group: 'binder' },
]

function makeModel(snapshot: Record<string, unknown> = {}) {
  return createTestModel({
    id: 'features-layer-test',
    data: { msa },
    ...snapshot,
  })
}

test('a feature becomes the annotation its GFF line would parse to', () => {
  const [annotation] = featuresToAnnotations([
    {
      row: 'seq1',
      start: 3,
      end: 8,
      name: 'lacZ',
      type: 'gene',
      strand: '-',
      score: 0.5,
    },
  ])
  expect(annotation).toEqual({
    id: 'seq1',
    accession: 'lacZ',
    name: 'lacZ',
    description: 'lacZ',
    featureType: 'gene',
    start: 3,
    end: 8,
    strand: -1,
    color: undefined,
    attributes: { name: 'lacZ', type: 'gene', strand: '-', score: '0.5' },
  })
})

test('an unnamed feature takes its placement as the key it groups by', () => {
  const [annotation] = featuresToAnnotations([
    { row: 'seq2', start: 4, end: 9 },
  ])
  expect(annotation!.accession).toBe('seq2:4-9')
  expect(annotation!.strand).toBeUndefined()
})

test('features draw beside the GFF annotations and share the legend', () => {
  const model = makeModel({ features })
  model.applyGFFText(
    '##gff-version 3\nseq1\tsrc\tprotein_match\t21\t30\t.\t.\t.\tName=sh3',
  )

  expect(model.filteredAnnotations.map(a => a.accession)).toEqual([
    'sh3',
    'kinase',
    'myb',
  ])
  expect(model.annotationsByRow.seq1!.map(a => a.accession)).toEqual([
    'sh3',
    'kinase',
  ])
  expect(model.actuallyShowDomains).toBe(true)
})

test('featureFill colors features by a field of their own', () => {
  const model = makeModel({
    features,
    encodings: [{ channel: 'featureFill', field: 'group' }],
  })
  const fillOf = (accession: string) =>
    model.featureColors.get(
      model.filteredAnnotations.find(a => a.accession === accession)!,
    )!.fill

  expect(fillOf('myb')).toBe('#F8766D')
  expect(fillOf('kinase')).toBe('#00BFC4')
})

test('the layer persists in the snapshot, and an empty one adds nothing', () => {
  const model = makeModel()
  expect(getSnapshot(model)).not.toHaveProperty('features')

  model.setFeatures(features)
  expect(getSnapshot(model).features).toEqual(features)

  model.setFeatures([])
  expect(model.noDomains).toBe(true)
})

// @vitest-environment jsdom
//
// What the overlay remembers between one opening of a view and the next: the
// reader's choice to hide it, the annotations belonging to the file currently
// loaded, and which types they filtered out.
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

const msa = '>a\nMKAANSE\n>b\nMKA-NSE'
const gff = `##gff-version 3
a\tPfam\tprotein_match\t1\t3\t.\t+\t.\tName=PF00001;signature_desc=one
b\tPfam\tprotein_match\t2\t5\t.\t+\t.\tName=PF00002;signature_desc=two
`

function makeModel(data: Record<string, string> = { msa, gff }) {
  const model = MSAModelF().create({
    id: 'annotations-state-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data,
  })
  model.setWidth(800)
  return model
}

test('annotations load drawn, and stay hidden once hidden', () => {
  const model = makeModel()
  expect(model.annotations.length).toBe(2)
  expect(model.actuallyShowDomains).toBe(true)

  model.setShowDomains(false)
  const restored = MSAModelF().create(getSnapshot(model))
  restored.setWidth(800)

  // the gff is parsed again on the way in, and used to turn the overlay back
  // on as it went: a link shared with it hidden opened with it drawn
  expect(restored.annotations.length).toBe(2)
  expect(restored.actuallyShowDomains).toBe(false)
})

test('a new alignment does not keep the old annotations', () => {
  const model = makeModel()
  model.setData({ msa: '>x\nAAAA\n>y\nAAAA' })
  expect(model.annotations).toEqual([])
  expect(model.actuallyShowDomains).toBe(false)
})

test('only the filtered-out types reach the snapshot', () => {
  const model = makeModel()
  expect((getSnapshot(model) as any).turnedOffFeatures).toBeUndefined()
  expect(model.visibleDomainTypes.map(d => d.accession)).toEqual([
    'PF00001',
    'PF00002',
  ])

  model.setFilter('PF00001', false)
  expect((getSnapshot(model) as any).turnedOffFeatures).toEqual({
    PF00001: true,
  })
  expect(model.visibleDomainTypes.map(d => d.accession)).toEqual(['PF00002'])

  model.setFilter('PF00001', true)
  expect((getSnapshot(model) as any).turnedOffFeatures).toBeUndefined()
})

test('a type the next file does not have leaves nothing behind', () => {
  const model = makeModel()
  model.setFilter('PF00001', false)
  model.setData({
    msa,
    gff: `##gff-version 3
a\tPfam\tprotein_match\t1\t3\t.\t+\t.\tName=PF00009;signature_desc=nine
`,
  })
  // the second file's type is drawn without anyone having to enumerate it, and
  // the first file's accessions are not in the annotation list any more
  expect(model.visibleDomainTypes.map(d => d.accession)).toEqual(['PF00009'])
  expect([...model.annotationTypes.keys()]).toEqual(['PF00009'])
})

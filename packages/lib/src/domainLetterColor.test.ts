// @vitest-environment jsdom
//
// Letters drawn on top of the domain overlay take their color from the box
// underneath them. The overlay paints bands largest-first, so with nested
// signatures -- routine in InterProScan output, where a family encloses a
// domain -- the box actually visible at a column is the *last* one painted,
// not the first one covering it.
import { expect, test } from 'vitest'

import { domainBandCursor } from './components/msa/domainBandCursor.ts'
import MSAModelF from './model.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'
const msa = `>seq1\n${row}\n>seq2\n${row}`

// PF_OUTER spans the whole row, PF_INNER sits inside it. tidyInterProAnnotations
// orders by length descending, so the outer band paints first and the inner one
// covers it.
const gff = `##gff-version 3
seq1\tPfam\tprotein_match\t1\t20\t.\t.\t.\tName=PF_OUTER;signature_desc=Outer
seq1\tPfam\tprotein_match\t8\t12\t.\t.\t.\tName=PF_INNER;signature_desc=Inner`

function makeModel() {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
  })
  model.setWidth(800)
  model.applyGFFText(gff)
  return model
}

function sweep(model: ReturnType<typeof makeModel>, from = 0) {
  const bandAt = domainBandCursor(model.domainBandsByStart.get('seq1'))
  const out: (string | undefined)[] = []
  for (let col = from; col < 20; col++) {
    out.push(bandAt(col)?.annotation.accession)
  }
  return out
}

test('the overlay paints largest-first, so stackIndex is paint order', () => {
  const bands = makeModel().domainBands.get('seq1')!
  expect(bands.map(b => [b.annotation.accession, b.stackIndex])).toEqual([
    ['PF_OUTER', 0],
    ['PF_INNER', 1],
  ])
})

test('a nested band wins the columns it covers', () => {
  const model = makeModel()
  // PF_INNER is seq positions 8-12 (1-based), i.e. columns 7..11
  expect(sweep(model)).toEqual([
    ...Array.from({ length: 7 }, () => 'PF_OUTER'),
    ...Array.from({ length: 5 }, () => 'PF_INNER'),
    ...Array.from({ length: 8 }, () => 'PF_OUTER'),
  ])
})

test('a sweep starting mid-block picks up bands opened before it', () => {
  // canvas blocks start at arbitrary columns, so the cursor has to catch up on
  // its first call rather than assuming it began at column 0
  const model = makeModel()
  expect(sweep(model, 9)).toEqual([
    'PF_INNER',
    'PF_INNER',
    'PF_INNER',
    ...Array.from({ length: 8 }, () => 'PF_OUTER'),
  ])
})

test('columns outside every band have no covering band', () => {
  const model = makeModel()
  model.setFilter('PF_OUTER', false)
  const bandAt = domainBandCursor(model.domainBandsByStart.get('seq1'))
  expect(bandAt(0)).toBeUndefined()
  expect(bandAt(9)?.annotation.accession).toBe('PF_INNER')
  expect(bandAt(19)).toBeUndefined()
})

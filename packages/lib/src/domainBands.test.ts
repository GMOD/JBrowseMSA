// @vitest-environment jsdom
// The domain overlay resolves each annotation to the visible column span it is
// drawn across once, on the model, instead of converting sequence positions
// inside every canvas block. These tests pin that span (including across hidden
// gappy columns) and the hit-test built on top of it.
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// row `b` has a 4-residue insertion relative to `a`, which becomes a run of
// mostly-gap columns that gap hiding can remove
const msa = `>a
MKLV----WYAC
>b
MKLVQQQQWYAC`

const gff = `##gff-version 3
a	Pfam	protein_match	1	4	.	.	.	Name=PF00001;signature_desc=First
a	Pfam	protein_match	5	8	.	.	.	Name=PF00002;signature_desc=Second`

function makeModel() {
  const model = MSAModelF().create({
    id: 'domain-bands-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    data: { msa },
  })
  model.setWidth(800)
  model.applyGFFText(gff)
  return model
}

test('bands span the columns their residues occupy', () => {
  const model = makeModel()
  const bands = model.domainBands.get('a')!
  expect(
    bands.map(b => [b.annotation.accession, b.startCol, b.endCol]),
  ).toEqual([
    ['PF00001', 0, 4],
    ['PF00002', 8, 12],
  ])
})

test('bands follow the columns when gappy columns are hidden', () => {
  const model = makeModel()
  model.setHideGaps(true)
  model.setAllowedGappyness(50)
  // the 4 insertion columns are gaps in half the rows, so they are hidden and
  // everything to their right shifts left by 4
  expect(model.blanks).toEqual([4, 5, 6, 7])
  const bands = model.domainBands.get('a')!
  expect(bands.map(b => [b.startCol, b.endCol])).toEqual([
    [0, 4],
    [4, 8],
  ])
})

test('mouseOverDomains hit-tests against the drawn span', () => {
  const model = makeModel()
  const rowIndex = model.rowNames.indexOf('a')

  model.setMousePos(0, rowIndex)
  expect(model.mouseOverDomains.map(d => d.accession)).toEqual(['PF00001'])

  // the columns between the two domains are the insertion gap: no domain there
  model.setMousePos(5, rowIndex)
  expect(model.mouseOverDomains).toEqual([])

  model.setMousePos(8, rowIndex)
  expect(model.mouseOverDomains.map(d => d.accession)).toEqual(['PF00002'])

  // end column is exclusive
  model.setMousePos(12, rowIndex)
  expect(model.mouseOverDomains).toEqual([])

  // the other row has no annotations of its own
  model.setMousePos(0, model.rowNames.indexOf('b'))
  expect(model.mouseOverDomains).toEqual([])
})

test('filtering a domain off removes its band', () => {
  const model = makeModel()
  model.setFilter('PF00001', false)
  expect(model.domainBands.get('a')!.map(b => b.annotation.accession)).toEqual([
    'PF00002',
  ])
})

test('highlighted columns collapse into contiguous runs', () => {
  const model = makeModel()
  model.setHighlightedColumns([5, 1, 2, 3, 9])
  expect(model.highlightedColumnRuns).toEqual([
    { start: 1, end: 3 },
    { start: 5, end: 5 },
    { start: 9, end: 9 },
  ])
})

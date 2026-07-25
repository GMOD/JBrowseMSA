// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// the tree names a tip the alignment has no sequence for. It still occupies a
// row of vertical space (drawn blank), so anything that maps y-pixels to rows has
// to count it, or the last row becomes unhoverable and fit-to-height overshoots.
const msa = `>a
ACGT
>b
ACGT`
const tree = '((a:1,b:1):1,ghost:1);'

function makeModel() {
  const model = MSAModelF().create({
    id: 'row-space-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    data: { msa, tree },
  })
  model.setWidth(800)
  return model
}

test('row space counts tree leaves, not just rows with sequence', () => {
  const model = makeModel()
  expect(model.rowNames).toEqual(['a', 'b', 'ghost'])
  expect(model.rows.map(r => r[0])).toEqual(['a', 'b'])
  expect(model.numRows).toBe(3)
  expect(model.totalHeight).toBe(3 * model.rowHeight)
})

test('the last row is addressable', () => {
  const model = makeModel()
  const lastRow = model.numRows - 1
  model.setMousePos(0, lastRow)
  expect(model.mouseOverRowName).toBe('ghost')
})

test('fit vertically leaves every row on screen', () => {
  const model = makeModel()
  model.fitVertically()
  expect(model.totalHeight).toBeLessThanOrEqual(model.msaAreaHeight)
})

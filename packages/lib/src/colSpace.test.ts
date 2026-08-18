// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// a ragged alignment: row `a` stops early, so the alignment is as wide as `b`.
// Column space has to follow the widest row -- the gap analysis already does --
// or every column past the first row's end becomes unreachable: unscrollable,
// unhoverable, and missing from the minimap.
const msa = `>a
ACGT
>b
ACGTACGTAC`

function makeModel() {
  const model = MSAModelF().create({
    id: 'col-space-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
  })
  model.setWidth(800)
  return model
}

test('column space spans the widest row', () => {
  const model = makeModel()
  expect(model.numColumns).toBe(10)
  expect(model.totalWidth).toBe(10 * model.colWidth)
})

test('the last column agrees with the column statistics', () => {
  const model = makeModel()
  expect(model.colStats.numColumns).toBe(model.numColumns)
  expect(model.conservation).toHaveLength(model.numColumns)

  model.setMousePos(model.numColumns - 1, 1)
  expect(model.mouseOverColumnStats?.col).toBe(9)
  expect(model.visibleColToRowLetter('b', 9)).toBe('C')
})

// enough rows to force the vertical scrollbar, which eats into the width the
// alignment canvas actually gets
function makeTallModel() {
  const names = Array.from({ length: 60 }, (_, i) => `seq${i}`)
  const model = MSAModelF().create({
    id: 'col-fit-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 300,
    data: { msa: names.map(n => `>${n}\n${'ACGT'.repeat(50)}`).join('\n') },
  })
  model.setWidth(800)
  return model
}

test('fit horizontally leaves every column on screen', () => {
  const model = makeTallModel()
  expect(model.showVerticalScrollbar).toBe(true)

  model.fitHorizontally()
  // the canvas is the msa area minus the scrollbar; fitting to the msa area
  // alone pushed the last columns past the right edge, with no minimap to
  // show that anything was cut off
  expect(model.totalWidth).toBeLessThanOrEqual(model.msaCanvasWidth)
  expect(model.showHorizontalScrollbar).toBe(false)
})

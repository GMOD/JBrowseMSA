// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// column 3 is three quarters gaps, so hideGaps at 70% hides it
const msa = `>seq1
AC-DEFG
>seq2
AC--EFG
>seq3
AC-DEFG
>seq4
ACWDEFG`

function makeModel(snapshot: Record<string, unknown> = {}) {
  const model = MSAModelF().create({
    id: 'block-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    ...snapshot,
  })
  model.setWidth(800)
  return model
}

test('a view with no selection adds nothing to the snapshot', () => {
  const model = makeModel()
  expect(model.selection).toBeUndefined()
  expect(JSON.stringify(getSnapshot(model))).not.toContain('selection')
})

test('a selection round-trips through the snapshot', () => {
  const model = makeModel()
  model.setSelection({ start: 5, end: 2, rows: ['seq2', 'seq3'] })
  expect(model.selection).toEqual({ start: 2, end: 5, rows: ['seq2', 'seq3'] })

  const reopened = makeModel({
    selection: JSON.parse(JSON.stringify(getSnapshot(model))).selection,
  })
  expect(reopened.selection).toEqual(model.selection)

  model.clearSelection()
  expect(JSON.stringify(getSnapshot(model))).not.toContain('selection')
})

test('columns resolve to visible columns and rows to runs of indices', () => {
  const model = makeModel({
    selection: { start: 2, end: 4, rows: ['seq4', 'seq1', 'seq2', 'nope'] },
  })
  expect(model.resolvedSelection).toEqual({
    startCol: 1,
    endCol: 3,
    rowRuns: [
      [0, 1],
      [3, 3],
    ],
  })
  expect(model.selectionSize).toEqual({ columns: 3, rows: 3 })
})

test('a selection without rows covers every row', () => {
  const model = makeModel({ selection: { start: 1, end: 1 } })
  expect(model.resolvedSelection?.rowRuns).toEqual([[0, 3]])
  expect(
    makeModel({ selection: { start: 1, end: 1, rows: ['nope'] } }),
  ).toHaveProperty('resolvedSelection', undefined)
})

test('file columns survive hiding the gappy ones', () => {
  const model = makeModel({ selection: { start: 3, end: 5 } })
  model.setHideGaps(true)
  model.setAllowedGappyness(70)
  expect(model.blanks).toEqual([2])
  expect(model.selection).toEqual({ start: 3, end: 5 })
  expect(model.resolvedSelection).toMatchObject({ startCol: 2, endCol: 3 })

  model.setSelection({ start: 3, end: 3 })
  expect(model.resolvedSelection).toBeUndefined()
})

test('a drag selects the cells it covers, in file columns and row names', () => {
  const model = makeModel()
  model.setHideGaps(true)
  model.setAllowedGappyness(70)
  // visible column 3 is file column 5, past the hidden column 3
  model.selectBlock({ col: 3, row: 2 }, { col: 1, row: 1 })
  expect(model.selection).toEqual({ start: 2, end: 5, rows: ['seq2', 'seq3'] })

  model.selectBlock({ col: -4, row: -1 }, { col: 99, row: 99 })
  expect(model.selection).toEqual({ start: 1, end: 7 })

  model.selectBlock({ col: 0 }, { col: 1 })
  expect(model.selection).toEqual({ start: 1, end: 2 })
})

test('the block copies as FASTA across every file column it spans', () => {
  const model = makeModel({ selection: { start: 2, end: 5, rows: ['seq2'] } })
  model.setHideGaps(true)
  model.setAllowedGappyness(70)
  expect(model.selectionFasta).toBe('>seq2\nC--E\n')
  expect(model.selectionSize).toEqual({ columns: 4, rows: 1 })

  model.setSelection({ start: 6, end: 40 })
  expect(model.selectionFasta).toBe(
    '>seq1\nFG\n>seq2\nFG\n>seq3\nFG\n>seq4\nFG\n',
  )
})

test('zoom to selection fits the columns, and the rows it names', () => {
  const long = Array.from(
    { length: 40 },
    (_, i) => `>row${i}\n${'ACDEFGHIKL'.repeat(20)}`,
  ).join('\n')
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 500,
    data: { msa: long },
  })
  model.setWidth(900)

  model.setSelection({ start: 101, end: 120 })
  const { rowHeight } = model
  model.zoomToSelection()
  expect(model.colWidth * 20).toBeCloseTo(model.msaCanvasWidth)
  expect(model.scrollX).toBeCloseTo(-100 * model.colWidth)
  expect(model.rowHeight).toBe(rowHeight)

  const rows = Array.from({ length: 10 }, (_, i) => `row${20 + i}`)
  model.setSelection({ start: 101, end: 120, rows })
  model.zoomToSelection()
  expect(model.rowHeight * 10).toBeCloseTo(model.msaAreaHeight)
  expect(model.scrollY).toBeCloseTo(-20 * model.rowHeight)
})

test('reset clears the selection', () => {
  const model = makeModel({ selection: { start: 1, end: 2 } })
  model.reset()
  expect(model.selection).toBeUndefined()
})

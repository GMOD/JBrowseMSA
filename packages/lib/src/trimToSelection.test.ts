// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// column 4 is three quarters gaps, so hideGaps at 70% hides it, and seq4 has
// a W there, which marks an insertion
const msa = `>seq1
ACD-EFGHI
>seq2
ACD--FGHI
>seq3
ACD-EFGHI
>seq4
ACDWEFGHI`

function makeModel(snapshot: Record<string, unknown> = {}) {
  const model = MSAModelF().create({
    id: 'trim-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    ...snapshot,
  })
  model.setWidth(800)
  return model
}

test('the trim is off by default and adds nothing to the snapshot', () => {
  const model = makeModel({ selection: { start: 3, end: 6 } })
  expect(model.trimToSelection).toBe(false)
  expect(model.numColumns).toBe(9)
  expect(JSON.stringify(getSnapshot(model))).not.toContain('trimToSelection')
})

test('trimming hides every column outside the selection', () => {
  const model = makeModel({
    selection: { start: 3, end: 6 },
    trimToSelection: true,
  })
  expect(model.blanks).toEqual([0, 1, 6, 7, 8])
  expect(model.numColumns).toBe(4)
  expect(model.visibleColToGlobalCol(0)).toBe(2)
  expect(model.globalColToVisibleCol(1)).toBeUndefined()
  expect(model.columns2d[3]).toBe('DWEF')
  expect(model.resolvedSelection).toMatchObject({ startCol: 0, endCol: 3 })
  expect(getSnapshot(model).trimToSelection).toBe(true)
})

test('without a selection the trim keeps every column', () => {
  const model = makeModel({ trimToSelection: true })
  expect(model.blanks).toEqual([])
  expect(model.numColumns).toBe(9)
})

test('the trim composes with hiding gappy columns', () => {
  const model = makeModel({ selection: { start: 3, end: 6 } })
  model.setHideGaps(true)
  model.setAllowedGappyness(70)
  expect(model.gappyColumns).toEqual([3])
  model.setTrimToSelection(true)
  expect(model.blanks).toEqual([0, 1, 3, 6, 7, 8])
  expect(model.columns2d[3]).toBe('DEF')
  // the W in the hidden gappy column marks an insertion before visible
  // column 1; the trimmed columns mark none
  expect(model.insertionPositions.get('seq4')).toEqual([
    { pos: 1, letters: 'W' },
  ])
  expect([...model.insertionPositions.keys()]).toEqual(['seq4'])
})

test('highlights, column tracks and residues follow the trim', () => {
  const model = makeModel({
    selection: { start: 3, end: 6 },
    trimToSelection: true,
    highlights: [
      { start: 1, end: 2, label: 'outside' },
      { start: 5, end: 9, label: 'across' },
    ],
    columnTracks: [{ id: 'f', name: 'F', kind: 'text', data: 'abcdefghi' }],
  })
  expect(
    model.resolvedHighlights.map(h => [h.label, h.startCol, h.endCol]),
  ).toEqual([['across', 2, 3]])
  expect(model.columnTrackContent.get('f')?.data).toBe('cdef')
  // seq4's residue 4 is the W in file column 4, visible column 1
  expect(model.visibleColToSeqPosOneBased('seq4', 1)).toBe(4)
  expect(model.cellAt(0, 0)).toMatchObject({ column: 3, residue: 3 })
})

test('a protein trimmed to nucleotide letters stays a protein', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: '>a\nACGTLW\n>b\nACGTLW' },
    selection: { start: 1, end: 4 },
    trimToSelection: true,
  })
  expect(model.columns2d[0]).toBe('ACGT')
  expect(model.sequenceType).toBe('amino')
})

test('clearing the selection clears the trim, and reset forgets it', () => {
  const model = makeModel({
    selection: { start: 3, end: 6 },
    trimToSelection: true,
  })
  model.clearSelection()
  expect(model.trimToSelection).toBe(false)
  expect(model.numColumns).toBe(9)

  model.setSelection({ start: 2, end: 3 })
  expect(model.numColumns).toBe(9)
  model.setTrimToSelection(true)
  expect(model.numColumns).toBe(2)
  model.reset()
  expect(model.trimToSelection).toBe(false)
})

test('a drag inside a trimmed view selects file columns', () => {
  const model = makeModel({
    selection: { start: 3, end: 6 },
    trimToSelection: true,
  })
  model.selectBlock({ col: 1 }, { col: 2 })
  expect(model.selection).toEqual({ start: 4, end: 5 })
  expect(model.numColumns).toBe(2)
})

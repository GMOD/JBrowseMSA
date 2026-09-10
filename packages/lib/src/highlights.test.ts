// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// seq2 skips columns 3-4 of the alignment, so its residue 3 sits at global
// column 5 (1-based). The all-gap column 4 is what hideGaps removes.
const msa = `>seq1
AC-DEFG
>seq2
AC--EFG
>seq3
AC-DEFG`

function makeModel(highlights: Record<string, unknown>[]) {
  const model = MSAModelF().create({
    id: 'highlights-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    highlights,
  })
  model.setWidth(800)
  return model
}

test('a column span is 1-based and lands on 0-based visible columns', () => {
  const model = makeModel([{ start: 2, end: 4, label: 'x' }])
  expect(model.resolvedHighlights).toEqual([
    { startCol: 1, endCol: 3, rowIndices: [], label: 'x', color: undefined },
  ])
})

test('a residue span projects through the named row', () => {
  const model = makeModel([{ row: 'seq2', start: 3, end: 4 }])
  expect(model.resolvedHighlights[0]).toMatchObject({ startCol: 4, endCol: 5 })
})

test('hidden columns shift a span and drop one they swallow whole', () => {
  const model = makeModel([
    { start: 5, end: 6, label: 'after' },
    { start: 3, end: 3, label: 'gone' },
    { row: 'seq2', start: 2, end: 3, label: 'across' },
  ])
  model.setHideGaps(true)
  model.setAllowedGappyness(50)
  expect(model.blanks).toEqual([2])
  expect(
    model.resolvedHighlights.map(h => [h.label, h.startCol, h.endCol]),
  ).toEqual([
    ['after', 3, 4],
    ['across', 1, 3],
  ])
})

test('a row set resolves to row indices and ignores unknown names', () => {
  const model = makeModel([{ rows: ['seq3', 'nope', 'seq1'], color: 'red' }])
  expect(model.resolvedHighlights).toEqual([
    { rowIndices: [2, 0], label: undefined, color: 'red' },
  ])
  expect(makeModel([{ rows: ['nope'] }]).resolvedHighlights).toEqual([])
})

test('setHighlights replaces the list and reset clears it', () => {
  const model = makeModel([])
  model.setHighlights([{ start: 1, end: 1 }])
  expect(model.highlights).toHaveLength(1)
  model.reset()
  expect(model.highlights).toHaveLength(0)
})

test('two owners hold their own highlights instead of one erasing the other', () => {
  // the bug this replaces: one slot, so a structure viewer clearing its hover
  // took the genome view's highlight with it
  const model = makeModel([])
  model.applyHighlight('protein3d', [{ start: 1, end: 1, label: 'residue 12' }])
  model.applyHighlight('genome', [{ start: 5, end: 6, label: 'exon 3' }])
  expect(model.resolvedHighlights.map(h => h.label)).toEqual([
    'residue 12',
    'exon 3',
  ])

  model.clearHighlight('protein3d')
  expect(model.resolvedHighlights.map(h => h.label)).toEqual(['exon 3'])

  model.clearHighlight('genome')
  expect(model.resolvedHighlights).toEqual([])
})

test('an owner replaces its own highlights rather than accumulating them', () => {
  const model = makeModel([])
  model.applyHighlight('hover', [{ start: 1, end: 1, label: 'first' }])
  model.applyHighlight('hover', [{ start: 2, end: 2, label: 'second' }])
  expect(model.resolvedHighlights.map(h => h.label)).toEqual(['second'])
})

test('clearing an owner that never showed anything changes nothing', () => {
  const model = makeModel([{ start: 1, end: 1, label: 'kept' }])
  const before = model.transientHighlights
  model.clearHighlight('never-used')
  expect(model.transientHighlights).toBe(before)
  expect(model.resolvedHighlights.map(h => h.label)).toEqual(['kept'])
})

test('a transient highlight resolves like a persisted one, and stays out of the snapshot', () => {
  const model = makeModel([])
  // a residue span of a gapped row, the case that needs the projection
  model.applyHighlight('protein3d', [
    { row: 'seq2', start: 3, end: 3, label: 'residue 3' },
  ])
  expect(
    model.resolvedHighlights.map(h => [h.label, h.startCol, h.endCol]),
  ).toEqual([['residue 3', 4, 4]])
  expect(getSnapshot(model)).not.toHaveProperty('transientHighlights')
})

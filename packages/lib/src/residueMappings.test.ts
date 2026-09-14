// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { ResidueMapping } from './types.ts'

const msa = `>alpha
MKAANSEQ
>beta
MK--NSEQ`

// row residues 1-8 map to structure 3-10; 5-6 are in SEQRES without coordinates
const mapping: ResidueMapping = {
  row: 'alpha',
  accession: 'P00001',
  structure: { id: '1ABC', kind: 'experimental', asymId: 'A' },
  segments: [{ rowStart: 1, rowEnd: 8, structStart: 3, structEnd: 10 }],
  unobserved: [[5, 6]],
}

function makeModel(residueMappings: ResidueMapping[]) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
    residueMappings,
  })
  model.setWidth(800)
  return model
}

test('a mapped residue resolves both ways through the offset', () => {
  const model = makeModel([mapping])
  expect(model.structureResidue('alpha', 1)).toEqual({
    structure: mapping.structure,
    position: 3,
    observed: true,
  })
  expect(model.rowResidue('1ABC', 3)).toEqual({ rowName: 'alpha', seqPos: 1 })
  expect(model.structureResidue('alpha', 8)?.position).toBe(10)
  expect(model.rowResidue('1ABC', 10)?.seqPos).toBe(8)
})

test('a residue in SEQRES without coordinates is mapped but not observed', () => {
  const model = makeModel([mapping])
  expect(model.structureResidue('alpha', 3)).toEqual({
    structure: mapping.structure,
    position: 5,
    observed: false,
  })
  expect(model.structureResidue('alpha', 2)?.observed).toBe(true)
})

test('nothing outside a segment gets an answer', () => {
  const model = makeModel([mapping])
  expect(model.structureResidue('alpha', 9)).toBeUndefined()
  expect(model.structureResidue('alpha', 0)).toBeUndefined()
  expect(model.rowResidue('1ABC', 2)).toBeUndefined()
  expect(model.rowResidue('1ABC', 11)).toBeUndefined()
})

test('an unmapped row or structure gets nothing, not a fallback', () => {
  const model = makeModel([mapping])
  expect(model.structureResidue('beta', 1)).toBeUndefined()
  expect(model.structureResidue('nope', 1)).toBeUndefined()
  expect(model.rowResidue('9XYZ', 3)).toBeUndefined()
  expect(makeModel([]).structureResidue('alpha', 1)).toBeUndefined()
})

test('several segments cover a row broken by a disordered loop', () => {
  const model = makeModel([
    {
      row: 'alpha',
      structure: { id: '1ABC' },
      segments: [
        { rowStart: 1, rowEnd: 3, structStart: 1, structEnd: 3 },
        { rowStart: 6, rowEnd: 8, structStart: 20, structEnd: 22 },
      ],
    },
  ])
  expect(model.structureResidue('alpha', 3)?.position).toBe(3)
  expect(model.structureResidue('alpha', 6)?.position).toBe(20)
  expect(model.structureResidue('alpha', 4)).toBeUndefined()
  expect(model.rowResidue('1ABC', 21)?.seqPos).toBe(7)
})

test('asymId picks between two chains of one entry, and is required to', () => {
  const model = makeModel([
    {
      row: 'alpha',
      structure: { id: '1ABC', asymId: 'A' },
      segments: [{ rowStart: 1, rowEnd: 8, structStart: 1, structEnd: 8 }],
    },
    {
      row: 'beta',
      structure: { id: '1ABC', asymId: 'B' },
      segments: [{ rowStart: 1, rowEnd: 6, structStart: 1, structEnd: 6 }],
    },
  ])
  expect(model.rowResidue('1ABC', 4, 'B')?.rowName).toBe('beta')
  expect(model.rowResidue('1ABC', 4, 'A')?.rowName).toBe('alpha')
  // both chains cover residue 4, so an unnamed chain is ambiguous
  expect(model.rowResidue('1ABC', 4)).toBeUndefined()
  // only alpha covers residue 7
  expect(model.rowResidue('1ABC', 7)?.rowName).toBe('alpha')
  expect(model.rowResidue('1ABC', 7, 'B')).toBeUndefined()
})

test('a row on several structures needs one named', () => {
  const segments = [{ rowStart: 1, rowEnd: 8, structStart: 1, structEnd: 8 }]
  const model = makeModel([
    { row: 'alpha', structure: { id: '1ABC', kind: 'experimental' }, segments },
    {
      row: 'alpha',
      structure: { id: 'AF-P00001-F1', kind: 'predicted' },
      segments,
    },
  ])
  expect(model.structureResidue('alpha', 4)).toBeUndefined()
  expect(model.structureResidue('alpha', 4, '1ABC')?.structure.kind).toBe(
    'experimental',
  )
  expect(
    model.structureResidue('alpha', 4, 'AF-P00001-F1')?.structure.kind,
  ).toBe('predicted')
  expect(model.mappedStructures.map(m => m.structure.id)).toEqual([
    '1ABC',
    'AF-P00001-F1',
  ])
})

test('a mapping computed against a different sequence is refused, and says so', () => {
  const model = makeModel([{ ...mapping, rowLength: 142 }])
  expect(model.structureResidue('alpha', 1)).toBeUndefined()
  expect(model.rowResidue('1ABC', 3)).toBeUndefined()
  expect(model.usableResidueMappings).toEqual([])
  expect(model.residueMappingProblems).toEqual([
    {
      row: 'alpha',
      structureId: '1ABC',
      scope: 'mapping',
      reason: 'computed against a 142-residue row; this one has 8',
    },
  ])
})

test('a declared row length that matches is no obstacle', () => {
  const model = makeModel([{ ...mapping, rowLength: 8 }])
  expect(model.residueMappingProblems).toEqual([])
  expect(model.structureResidue('alpha', 1)?.position).toBe(3)
})

test('a segment past the end of the row condemns the whole mapping', () => {
  const model = makeModel([
    {
      row: 'alpha',
      structure: { id: '1ABC' },
      segments: [{ rowStart: 1, rowEnd: 40, structStart: 1, structEnd: 40 }],
    },
  ])
  expect(model.structureResidue('alpha', 2)).toBeUndefined()
  expect(model.residueMappingProblems[0]?.reason).toBe(
    'segment 1-40 does not fit a 8-residue row',
  )
})

test('a mapping for a row that is not loaded says which', () => {
  const model = makeModel([{ ...mapping, row: 'gamma' }])
  expect(model.residueMappingProblems).toEqual([
    {
      row: 'gamma',
      structureId: '1ABC',
      scope: 'mapping',
      reason: 'no such row in the alignment',
    },
  ])
})

test('a segment whose sides disagree in length is skipped, and reported', () => {
  const model = makeModel([
    {
      row: 'alpha',
      structure: { id: '1ABC' },
      segments: [
        { rowStart: 1, rowEnd: 8, structStart: 1, structEnd: 4 },
        { rowStart: 1, rowEnd: 2, structStart: 30, structEnd: 31 },
      ],
    },
  ])
  // the well-formed segment still applies
  expect(model.structureResidue('alpha', 1)?.position).toBe(30)
  expect(model.structureResidue('alpha', 5)).toBeUndefined()
  expect(model.residueMappingProblems[0]?.reason).toBe(
    'segment 1-8 maps to 1-4, which is a different length',
  )
})

test('the mapping travels in the snapshot', () => {
  const model = makeModel([mapping])
  expect(getSnapshot(model).residueMappings).toEqual([mapping])
  expect(getSnapshot(makeModel([])).residueMappings).toBeUndefined()
})

test('a structure residue reaches a column through the row it maps to', () => {
  // structure hover -> row residue -> column, through beta's two gap columns
  const model = makeModel([
    {
      row: 'beta',
      structure: { id: '1ABC' },
      segments: [{ rowStart: 1, rowEnd: 6, structStart: 1, structEnd: 6 }],
    },
  ])
  const hit = model.rowResidue('1ABC', 3)!
  expect(hit).toEqual({ rowName: 'beta', seqPos: 3 })
  // seqPos is 1-based like the mapping; the column helpers are 0-based
  expect(model.seqPosToVisibleCol(hit.rowName, hit.seqPos - 1)).toBe(4)
})

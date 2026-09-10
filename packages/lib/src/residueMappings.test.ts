// @vitest-environment jsdom
//
// The correspondence between an alignment row and a structure is data, not
// something the viewer can work out: matching by sequence equality fails for a
// tagged construct, a truncation, or a row that is a subsequence of the entry.
// So the lookups' most important behaviour is refusing -- returning nothing
// where the guess they replace would have returned a plausible wrong residue.
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { ResidueMapping } from './types.ts'

const msa = `>alpha
MKAANSEQ
>beta
MK--NSEQ`

// the row is residues 1-8; the structure resolves 3-10, i.e. a construct whose
// numbering runs two ahead. 5-6 are in SEQRES but were not resolved.
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
  // row residue 3 is structure residue 5, which the structure declares and did
  // not resolve -- a different answer from "this protein has no such residue"
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
  // this is the case the 1:1 fallback answered wrongly: beta has no mapping,
  // so beta residue 1 is not "structure residue 1"
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
  // the gap between the segments is a hole, and a hole is unmapped
  expect(model.structureResidue('alpha', 4)).toBeUndefined()
  expect(model.rowResidue('1ABC', 21)?.seqPos).toBe(7)
})

test('asymId picks between two chains of one entry', () => {
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
  // without a chain the first mapping that covers it wins
  expect(model.rowResidue('1ABC', 4)?.rowName).toBe('alpha')
  // and a chain that covers nothing there still refuses
  expect(model.rowResidue('1ABC', 7, 'B')).toBeUndefined()
})

test('a segment whose sides disagree in length is skipped, not trusted', () => {
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
  // the malformed segment would have answered every one of those queries, off
  // by however much its sides disagree; the well-formed one behind it answers
  expect(model.structureResidue('alpha', 1)?.position).toBe(30)
  expect(model.structureResidue('alpha', 5)).toBeUndefined()
})

test('the mapping travels in the snapshot', () => {
  const model = makeModel([mapping])
  expect(getSnapshot(model).residueMappings).toEqual([mapping])
  expect(getSnapshot(makeModel([])).residueMappings).toBeUndefined()
})

test('a structure residue reaches a column through the row it maps to', () => {
  // what a host actually does with the lookup: structure hover -> row residue
  // -> the column it sits in. beta skips two columns, so the arithmetic has to
  // go through the row's gaps rather than treating residue n as column n.
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

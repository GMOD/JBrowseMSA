import { describe, expect, test } from 'vitest'

import {
  highlightGroups,
  mappedResidues,
  solidHex,
  solidMappedGroups,
} from './paint.ts'

import type { PolymerResidue } from './molstar.ts'
import type { Highlight, MsaViewModel } from 'react-msaview'

describe('solidHex', () => {
  test.each([
    ['rgba(255,140,0,0.15)', '#ff8c00'],
    ['rgb(0, 114, 178)', '#0072b2'],
    ['#E69F00', '#e69f00'],
    ['#f0c', '#ff00cc'],
    [undefined, '#ff8c00'],
    ['teal', '#ff8c00'],
  ])('%s -> %s', (css, hex) => {
    expect(solidHex(css)).toBe(hex)
  })
})

// a row of 10 residues on file columns 3..12, mapped onto chain A residue n+100
function fakeModel(highlights: Highlight[]) {
  return {
    highlights,
    mappedStructures: [
      { row: 'r', structure: { id: 'S', asymId: 'A', asymIdKind: 'label' } },
    ],
    rowResidue: (id: string, labelSeqId: number, asym: string) =>
      id === 'S' && asym === 'A' && labelSeqId > 100 && labelSeqId <= 110
        ? { rowName: 'r', seqPos: labelSeqId - 100 }
        : undefined,
    seqPosToGlobalCol: (_row: string, seqPos0: number) => seqPos0 + 2,
  } as unknown as MsaViewModel
}

const residues: PolymerResidue[] = Array.from({ length: 12 }, (_, i) => ({
  labelAsymId: 'A',
  authAsymId: 'A',
  labelSeqId: 99 + i,
}))

const idsOf = (groups: ReturnType<typeof highlightGroups>) =>
  Object.fromEntries(
    groups.map(([color, chains]) => [color, chains.flatMap(([, ids]) => ids)]),
  )

describe('highlightGroups', () => {
  test('a row highlight marks the structure residues of its residues', () => {
    const groups = highlightGroups(
      fakeModel([{ row: 'r', start: 2, end: 4, color: 'rgba(255,0,0,0.2)' }]),
      'S',
      residues,
    )
    expect(idsOf(groups)).toEqual({ '#ff0000': [102, 103, 104] })
  })

  test('a column highlight marks the residues of mapped rows on those columns', () => {
    // file columns are 1-based: column 3 is the row's first residue
    const groups = highlightGroups(
      fakeModel([{ start: 3, end: 5, color: '#0072b2' }]),
      'S',
      residues,
    )
    expect(idsOf(groups)).toEqual({ '#0072b2': [101, 102, 103] })
  })

  test('a rows highlight marks every residue of the row', () => {
    const groups = highlightGroups(
      fakeModel([{ rows: ['r'], color: '#009e73' }]),
      'S',
      residues,
    )
    expect(idsOf(groups)['#009e73']).toHaveLength(10)
  })

  test('a rows highlight that also names columns marks the whole row, as the alignment draws it', () => {
    const groups = highlightGroups(
      fakeModel([{ rows: ['r'], start: 3, end: 4, color: '#009e73' }]),
      'S',
      residues,
    )
    expect(idsOf(groups)['#009e73']).toHaveLength(10)
  })

  test('a later highlight wins where two overlap', () => {
    const groups = highlightGroups(
      fakeModel([
        { row: 'r', start: 1, end: 5, color: '#ff0000' },
        { row: 'r', start: 3, end: 3, color: '#0000ff' },
      ]),
      'S',
      residues,
    )
    expect(idsOf(groups)).toEqual({
      '#0000ff': [103],
      '#ff0000': [101, 102, 104, 105],
    })
  })

  test('a highlight on a row the structure is not mapped to marks nothing', () => {
    expect(
      highlightGroups(
        fakeModel([{ row: 'other', start: 1, end: 9 }]),
        'S',
        residues,
      ),
    ).toEqual([])
  })

  test('no highlights give no groups', () => {
    expect(highlightGroups(fakeModel([]), 'S', residues)).toEqual([])
  })
})

describe('solid colors over the mapped part of a structure', () => {
  test('colors the mapped residues and leaves the rest pale', () => {
    const groups = solidMappedGroups(fakeModel([]), 'S', residues, '#0072b2')
    expect(idsOf(groups)).toEqual({
      // chain residues 99..110; 101..110 are mapped, 99 and 100 are not
      '#0072b2': [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
      '#d9d9d4': [99, 100],
    })
  })

  test('lists only the mapped residues to frame a view on', () => {
    expect(
      mappedResidues(fakeModel([]), 'S', residues).map(r => r.labelSeqId),
    ).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109, 110])
  })
})

describe('a mapping that names no id space', () => {
  // label A is author B, and label C is author A, as in 1TUP's DNA and protein
  const crossed: PolymerResidue[] = [
    { labelAsymId: 'A', authAsymId: 'B', labelSeqId: 105 },
    { labelAsymId: 'C', authAsymId: 'A', labelSeqId: 105 },
  ]
  const unset = (asymIdKind?: 'auth') =>
    ({
      ...fakeModel([]),
      mappedStructures: [
        { row: 'r', structure: { id: 'S', asymId: 'A', asymIdKind } },
      ],
    }) as unknown as MsaViewModel

  test('reads its chain as the label id the structure carries, never both', () => {
    expect(mappedResidues(unset(), 'S', crossed)).toEqual([crossed[0]])
  })

  test('reads an author id as one', () => {
    expect(mappedResidues(unset('auth'), 'S', crossed)).toEqual([crossed[1]])
  })
})

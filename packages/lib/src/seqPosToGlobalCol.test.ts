// seqPos -> global column, exercised through the model method rather than the
// buildSeqPosIndex primitive behind it: the method is what
// jbrowse-plugin-protein3d calls (see the cross-repo note in model.ts), and it
// owns the past-the-end answers the index alone cannot give.
import { describe, expect, test } from 'vitest'

import MSAModelF from './model.ts'

function colsOf(row: string, positions: number[]) {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { msa: `>r\n${row}` },
  })
  model.setWidth(800)
  return positions.map(pos => model.seqPosToGlobalCol('r', pos))
}

describe('seqPosToGlobalCol', () => {
  test('is the identity when the row has no gaps', () => {
    // 8 residues, so seqPos 8 is one past the end
    expect(colsOf('ATGCATGC', [0, 3, 7, 8])).toEqual([0, 3, 7, 8])
  })

  test('skips gap columns', () => {
    // Global: A(0) -(1) T(2) G(3) -(4) C(5) A(6) -(7) T(8) G(9) C(10)
    // SeqPos: A(0)      T(1) G(2)      C(3) A(4)      T(5) G(6) C(7)
    expect(colsOf('A-TG-CA-TGC', [0, 1, 2, 3, 4, 5, 6, 7, 8])).toEqual([
      0, 2, 3, 5, 6, 8, 9, 10, 11,
    ])
  })

  test('counts both gap characters, - and .', () => {
    // Global: A(0) -(1) .(2) G(3) -(4) C(5) .(6)
    // SeqPos: A(0)           G(1)      C(2)
    expect(colsOf('A-.G-C.', [0, 1, 2, 3])).toEqual([0, 3, 5, 7])
  })

  test('handles leading and trailing gaps', () => {
    expect(colsOf('--ACG', [0, 1, 2])).toEqual([2, 3, 4])
    expect(colsOf('ACG--', [0, 1, 2, 3])).toEqual([0, 1, 2, 5])
  })

  test('an all-gap row reports position 0 at column 0', () => {
    expect(colsOf('---..--', [0, 1])).toEqual([0, 7])
  })

  test('an empty row reports column 0', () => {
    expect(colsOf('', [0])).toEqual([0])
  })

  test('an unknown row reports column 0', () => {
    const model = MSAModelF().create({
      type: 'MsaView',
      data: { msa: '>r\nACGT' },
    })
    model.setWidth(800)
    expect(model.seqPosToGlobalCol('nope', 2)).toBe(0)
  })
})

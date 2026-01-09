import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA'

describe('A3mMSA', () => {
  describe('sniff', () => {
    test('returns false for non-FASTA text', () => {
      expect(A3mMSA.sniff('not fasta')).toBe(false)
      expect(A3mMSA.sniff('CLUSTAL W')).toBe(false)
    })

    test('returns false for regular FASTA', () => {
      const fasta = `>seq1
ACDEFGHIKLMNPQRSTVWY
>seq2
ACDEFGHIKLMNPQRSTVWY`
      expect(A3mMSA.sniff(fasta)).toBe(false)
    })

    test('returns true for A3M format', () => {
      const a3m = `>seq1
ACDEFghiKLMNPQ
>seq2
ACDEF---KLMNPQ`
      expect(A3mMSA.sniff(a3m)).toBe(true)
    })

    test('returns false for single sequence', () => {
      const a3m = `>seq1
ACDEFghiKLMNPQ`
      expect(A3mMSA.sniff(a3m)).toBe(false)
    })
  })

  describe('parsing', () => {
    test('parses simple A3M', () => {
      const a3m = `>seq1
ACDEFghiKLMNPQ
>seq2
ACDEF---KLMNPQ`
      const msa = new A3mMSA(a3m)

      expect(msa.getNames()).toEqual(['seq1', 'seq2'])
      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      expect(seq1.length).toBe(seq2.length)
      expect(seq1).toContain('GHI')
    })

    test('expands lowercase insertions', () => {
      const a3m = `>seq1
ACabc
>seq2
AC---`
      const msa = new A3mMSA(a3m)

      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      expect(seq1).toBe('ACABC')
      expect(seq2).toBe('AC...')
    })

    test('handles multiple insertions', () => {
      const a3m = `>seq1
AabcDdefG
>seq2
A---D---G`
      const msa = new A3mMSA(a3m)

      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      expect(seq1.length).toBe(seq2.length)
    })

    test('getWidth returns correct width', () => {
      const a3m = `>seq1
ACDEF
>seq2
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.getWidth()).toBe(5)
    })

    test('getMSA returns seqdata', () => {
      const a3m = `>seq1
ACDEF
>seq2
GHIKL`
      const msa = new A3mMSA(a3m)
      const data = msa.getMSA()

      expect(data.seqdata).toHaveProperty('seq1')
      expect(data.seqdata).toHaveProperty('seq2')
    })

    test('getTree returns noTree structure', () => {
      const a3m = `>seq1
ACDEF
>seq2
GHIKL`
      const msa = new A3mMSA(a3m)
      const tree = msa.getTree()

      expect(tree.noTree).toBe(true)
      expect(tree.children).toHaveLength(2)
    })

    test('handles empty sequences', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.getNames()).toEqual(['seq1'])
    })

    test('handles sequences with only ID on defline', () => {
      const a3m = `>seq1 description here
ACDEF
>seq2 another description
GHIKL`
      const msa = new A3mMSA(a3m)

      expect(msa.getNames()).toEqual(['seq1', 'seq2'])
    })

    test('preserves sequence order', () => {
      const a3m = `>z_seq
AAAAA
>a_seq
CCCCC
>m_seq
DDDDD`
      const msa = new A3mMSA(a3m)

      expect(msa.getNames()).toEqual(['z_seq', 'a_seq', 'm_seq'])
    })
  })

  describe('properties', () => {
    test('alignmentNames is empty array', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.alignmentNames).toEqual([])
    })

    test('seqConsensus is undefined', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.seqConsensus).toBeUndefined()
    })

    test('secondaryStructureConsensus is undefined', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.secondaryStructureConsensus).toBeUndefined()
    })

    test('tracks is empty array', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.tracks).toEqual([])
    })

    test('getStructures returns empty object', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.getStructures()).toEqual({})
    })

    test('getHeader returns empty object', () => {
      const a3m = `>seq1
ACDEF`
      const msa = new A3mMSA(a3m)

      expect(msa.getHeader()).toEqual({})
    })
  })
})

import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA.ts'

// A3M format rules (see https://yanglab.qd.sdu.edu.cn/trRosetta/msa_format.html):
//
// - Uppercase letters = "match columns" (aligned positions shared by all seqs)
// - Lowercase letters = insertions (extra residues in one seq, not a match column)
// - Dashes '-'        = deletions (missing residue at a match column, counts as match)
// - Dots '.'          = gaps aligned to insertions in other sequences
//
// Key constraint: all sequences must have the same number of match columns
// (uppercase + dashes). Lowercase chars don't count toward this total.
//
// When expanded to a standard alignment, lowercase inserts become new columns
// (uppercased), and sequences without inserts at that position get '.' gaps.

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
      // seq1: match=ACDEFKLMNPQ (11), insert=ghi (3)
      // seq2: match=ACDEFKLMNPQ (11)
      // Same match count + has lowercase → detected as A3M
      const a3m = `>seq1
ACDEFghiKLMNPQ
>seq2
ACDEFKLMNPQ`
      expect(A3mMSA.sniff(a3m)).toBe(true)
    })

    test('returns false for single sequence', () => {
      const a3m = `>seq1
ACDEFghiKLMNPQ`
      expect(A3mMSA.sniff(a3m)).toBe(false)
    })

    test('counts dashes as match columns in sniff', () => {
      // seq1: match=ACDEF (5), insert=ghi (3)
      // seq2: match=AC--F (5, where -- are deletions that count as match columns)
      // Same match count + has lowercase → detected as A3M
      const a3m = `>seq1
ACDEFghi
>seq2
AC--F`
      expect(A3mMSA.sniff(a3m)).toBe(true)
    })

    test('returns false when match column counts differ', () => {
      // seq1: 5 match columns (ACDEF)
      // seq2: 8 match columns (ACDEF---)
      // Without lowercase, this shouldn't be detected as a3m anyway
      const notA3m = `>seq1
ACDEF
>seq2
ACDEF---`
      expect(A3mMSA.sniff(notA3m)).toBe(false)
    })
  })

  describe('parsing', () => {
    test('parses simple A3M', () => {
      // Both have 11 match columns. seq1 has 3 lowercase inserts (ghi) after F.
      // After expansion, ghi becomes 3 new columns (uppercased in seq1, dots in seq2):
      //   seq1: ACDEF + GHI + KLMNPQ = ACDEFGHIKLMNPQ (14 chars)
      //   seq2: ACDEF + ... + KLMNPQ = ACDEF...KLMNPQ (14 chars)
      const a3m = `>seq1
ACDEFghiKLMNPQ
>seq2
ACDEFKLMNPQ`
      const msa = new A3mMSA(a3m)

      expect(msa.getNames()).toEqual(['seq1', 'seq2'])
      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      expect(seq1.length).toBe(seq2.length)
      expect(seq1).toContain('GHI')
    })

    test('expands lowercase insertions', () => {
      // seq1 has 2 match columns (A, C) with 3 lowercase inserts (abc)
      // seq2 has 2 match columns (A, C) with no inserts
      const a3m = `>seq1
ACabc
>seq2
AC`
      const msa = new A3mMSA(a3m)

      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      // seq1: A + C + ABC (inserts uppercased) = ACABC
      // seq2: A + C + ... (gaps for missing inserts) = AC...
      expect(seq1).toBe('ACABC')
      expect(seq2).toBe('AC...')
    })

    test('handles multiple insertions', () => {
      // seq1: 3 match columns (A, D, G) with inserts after A and D
      // seq2: 3 match columns (A, D, G) with no inserts
      const a3m = `>seq1
AabcDdefG
>seq2
ADG`
      const msa = new A3mMSA(a3m)

      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      expect(seq1.length).toBe(seq2.length)
      // seq1: A + ABC + D + DEF + G = AABCDDEFG
      // seq2: A + ... + D + ... + G = A...D...G
      expect(seq1).toBe('AABCDDEFG')
      expect(seq2).toBe('A...D...G')
    })

    test('treats dashes as match columns (deletions)', () => {
      // query: 6 match columns (ACDEFG)
      // seq1: 6 match columns with deletions at positions 3,4 (AC--FG)
      const a3m = `>query
ACDEFG
>seq1
AC--FG`
      const msa = new A3mMSA(a3m)

      const query = msa.getRow('query')
      const seq1 = msa.getRow('seq1')

      expect(query.length).toBe(seq1.length)
      expect(query).toBe('ACDEFG')
      expect(seq1).toBe('AC--FG')
    })

    test('handles leading dashes correctly', () => {
      // query: 6 match columns
      // seq1: 6 match columns with deletions at start
      const a3m = `>query
ACDEFG
>seq1
--DEFG`
      const msa = new A3mMSA(a3m)

      const query = msa.getRow('query')
      const seq1 = msa.getRow('seq1')

      expect(query.length).toBe(seq1.length)
      expect(query).toBe('ACDEFG')
      expect(seq1).toBe('--DEFG')
    })

    test('handles trailing dashes correctly', () => {
      const a3m = `>query
ACDEFG
>seq1
ACDE--`
      const msa = new A3mMSA(a3m)

      const query = msa.getRow('query')
      const seq1 = msa.getRow('seq1')

      expect(query.length).toBe(seq1.length)
      expect(query).toBe('ACDEFG')
      expect(seq1).toBe('ACDE--')
    })

    test('handles dashes with insertions', () => {
      // query: 4 match columns (ACFG) with insert (de) after C
      // seq1: 4 match columns with deletion at position 2
      const a3m = `>query
ACdeFG
>seq1
A-FG`
      const msa = new A3mMSA(a3m)

      const query = msa.getRow('query')
      const seq1 = msa.getRow('seq1')

      expect(query.length).toBe(seq1.length)
      // query: A + C + DE + F + G = ACDEFG
      // seq1: A + - + .. + F + G = A-..FG
      expect(query).toBe('ACDEFG')
      expect(seq1).toBe('A-..FG')
    })

    test('realistic a3m with insertions and deletions', () => {
      // All 3 sequences have 11 match columns (uppercase + dashes).
      // seq1 has 3 lowercase insertions (ghi) after the 5th match column.
      // seq2 uses dashes for deletions at match positions 1-2 and 9-10.
      //
      // A3M input (match columns marked with ^, inserts unmarked):
      //   query: A C D E F K L M N P Q
      //          ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^  = 11 match cols
      //   seq1:  A C D E F g h i K L M N P Q
      //          ^ ^ ^ ^ ^       ^ ^ ^ ^ ^ ^  = 11 match cols, ghi = inserts
      //   seq2:  - - D E F K L M - - Q
      //          ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^  = 11 match cols (dashes are deletions)
      //
      // After expansion (inserts become new columns, '.' fills gaps):
      //   query: ACDEF...KLMNPQ  (14 chars)
      //   seq1:  ACDEFGHIKLMNPQ  (14 chars, ghi uppercased)
      //   seq2:  --DEF...KLM--Q  (14 chars)
      const a3m = `>query
ACDEFKLMNPQ
>seq1
ACDEFghiKLMNPQ
>seq2
--DEFKLM--Q`
      const msa = new A3mMSA(a3m)

      const query = msa.getRow('query')
      const seq1 = msa.getRow('seq1')
      const seq2 = msa.getRow('seq2')

      expect(query.length).toBe(seq1.length)
      expect(query.length).toBe(seq2.length)

      expect(query).toBe('ACDEF...KLMNPQ')
      expect(seq1).toBe('ACDEFGHIKLMNPQ')
      expect(seq2).toBe('--DEF...KLM--Q')
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

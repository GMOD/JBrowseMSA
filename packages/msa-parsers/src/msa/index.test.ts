import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA.ts'
import ClustalMSA from './ClustalMSA.ts'
import FastaMSA from './FastaMSA.ts'
import { getUngappedSequence, parseMSA } from './index.ts'
import parseNewick from './parseNewick.ts'

describe('parseMSA', () => {
  test('parses FASTA format', () => {
    const fasta = `>seq1
ACDEF
>seq2
GHIKL`
    const msa = parseMSA(fasta)

    expect(msa).toBeInstanceOf(FastaMSA)
    expect(msa.getNames()).toEqual(['seq1', 'seq2'])
  })

  test('parses A3M format', () => {
    const a3m = `>seq1
ACDEFghiKLMNPQ
>seq2
ACDE-KLMNPQ`
    const msa = parseMSA(a3m)

    expect(msa).toBeInstanceOf(A3mMSA)
  })

  test('parses Clustal format', () => {
    const clustal = `CLUSTAL W (1.83) multiple sequence alignment

seq1      ACDEFGHIKL
seq2      ACDEFGHIKL
          **********`
    const msa = parseMSA(clustal)

    expect(msa).toBeInstanceOf(ClustalMSA)
  })

  test('defaults to Clustal for unknown format', () => {
    const unknown = `some unknown format
that doesn't match anything`
    const msa = parseMSA(unknown)

    expect(msa).toBeInstanceOf(ClustalMSA)
  })
})

describe('FastaMSA colon-in-name lookup', () => {
  const fasta = `>EU105457.1|chr09:67680268..67675529_LTR/Copia
ACDEFGHIKL
>seq2
MNPQRSTVWY`

  test('getRow finds sequence by original colon name', () => {
    const msa = new FastaMSA(fasta)
    expect(msa.getRow('EU105457.1|chr09:67680268..67675529_LTR/Copia')).toBe(
      'ACDEFGHIKL',
    )
  })

  test('getRow finds sequence by underscore name (as produced by external Newick tools)', () => {
    const msa = new FastaMSA(fasta)
    expect(msa.getRow('EU105457.1|chr09_67680268..67675529_LTR/Copia')).toBe(
      'ACDEFGHIKL',
    )
  })

  test('getRow does not confuse a plain-underscore name with a colon-normalized name', () => {
    const msa = new FastaMSA(fasta)
    expect(msa.getRow('seq2')).toBe('MNPQRSTVWY')
  })
})

describe('parseNewick single-quoted names', () => {
  test('parses quoted name containing a colon', () => {
    const tree = parseNewick(
      "('EU105457.1|chr09:67680268..67675529_LTR/Copia':0.5,seq2:0.3);",
    )
    const names = tree.children.map((c: Record<string, unknown>) => c.name)
    expect(names).toContain('EU105457.1|chr09:67680268..67675529_LTR/Copia')
  })

  test('parses quoted name containing a single quote', () => {
    const tree = parseNewick("('it''s a name':0.1,seq2:0.2);")
    const names = tree.children.map((c: Record<string, unknown>) => c.name)
    expect(names).toContain("it's a name")
  })

  test('unquoted names still parse correctly', () => {
    const tree = parseNewick('(seq1:0.1,seq2:0.2);')
    const names = tree.children.map((c: Record<string, unknown>) => c.name)
    expect(names).toEqual(['seq1', 'seq2'])
  })
})

describe('getUngappedSequence', () => {
  test('removes dashes', () => {
    expect(getUngappedSequence('AC--DEF')).toBe('ACDEF')
  })

  test('removes dots', () => {
    expect(getUngappedSequence('AC..DEF')).toBe('ACDEF')
  })

  test('removes mixed gaps', () => {
    expect(getUngappedSequence('A-C.D--E..F')).toBe('ACDEF')
  })

  test('handles empty string', () => {
    expect(getUngappedSequence('')).toBe('')
  })

  test('handles string with only gaps', () => {
    expect(getUngappedSequence('---...')).toBe('')
  })

  test('handles string with no gaps', () => {
    expect(getUngappedSequence('ACDEF')).toBe('ACDEF')
  })
})

import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA'
import ClustalMSA from './ClustalMSA'
import FastaMSA from './FastaMSA'
import { getUngappedSequence, parseMSA } from './index'

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
ACDEF---KLMNPQ`
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

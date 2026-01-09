import { describe, expect, test } from 'vitest'

import { parse, parseAll, sniff } from './stockholmParser'

describe('stockholmParser', () => {
  describe('sniff', () => {
    test('returns true for Stockholm format', () => {
      expect(sniff('# STOCKHOLM 1.0\n')).toBe(true)
    })

    test('returns false for non-Stockholm format', () => {
      expect(sniff('>seq1\nACDEF')).toBe(false)
      expect(sniff('CLUSTAL W')).toBe(false)
    })
  })

  describe('parseAll', () => {
    test('parses simple Stockholm file', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1  ACDEFGHIKL
seq2  ACDEFGHIKL
//`
      const result = parseAll(stockholm)
      expect(result).toHaveLength(1)
      expect(result[0]?.seqdata).toEqual({
        seq1: 'ACDEFGHIKL',
        seq2: 'ACDEFGHIKL',
      })
      expect(result[0]?.seqname).toEqual(['seq1', 'seq2'])
    })

    test('parses GF lines', () => {
      const stockholm = `# STOCKHOLM 1.0
#=GF DE Description of the alignment
#=GF NH (A:0.1,B:0.2);
seq1  ACDEF
//`
      const result = parseAll(stockholm)
      expect(result[0]?.gf.DE).toEqual(['Description of the alignment'])
      expect(result[0]?.gf.NH).toEqual(['(A:0.1,B:0.2);'])
    })

    test('parses GC lines', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1          ACDEF
#=GC seq_cons *****
#=GC SS_cons  <<>>>
//`
      const result = parseAll(stockholm)
      expect(result[0]?.gc.seq_cons).toBe('*****')
      expect(result[0]?.gc.SS_cons).toBe('<<>>>')
    })

    test('parses GS lines', () => {
      const stockholm = `# STOCKHOLM 1.0
#=GS seq1 AC P12345
#=GS seq1 DR PDB; 1ABC A; 1-100
seq1  ACDEF
//`
      const result = parseAll(stockholm)
      expect(result[0]?.gs.AC?.seq1).toEqual(['P12345'])
      expect(result[0]?.gs.DR?.seq1).toEqual(['PDB; 1ABC A; 1-100'])
    })

    test('parses multiple alignments', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1  ACDEF
//
# STOCKHOLM 1.0
seq2  GHIKL
//`
      const result = parseAll(stockholm)
      expect(result).toHaveLength(2)
      expect(result[0]?.seqdata.seq1).toBe('ACDEF')
      expect(result[1]?.seqdata.seq2).toBe('GHIKL')
    })

    test('concatenates interleaved sequence blocks', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1  ACDEF
seq2  GHIKL

seq1  MNOPQ
seq2  RSTUV
//`
      const result = parseAll(stockholm)
      expect(result[0]?.seqdata.seq1).toBe('ACDEFMNOPQ')
      expect(result[0]?.seqdata.seq2).toBe('GHIKLRSTUV')
    })

    test('handles file without trailing //', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1  ACDEF`
      const result = parseAll(stockholm)
      expect(result).toHaveLength(1)
      expect(result[0]?.seqdata.seq1).toBe('ACDEF')
    })
  })

  describe('parse', () => {
    test('returns single alignment', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1  ACDEF
//`
      const result = parse(stockholm)
      expect(result.seqdata.seq1).toBe('ACDEF')
    })

    test('throws on empty input', () => {
      expect(() => parse('')).toThrow('No alignments found')
    })

    test('throws on multiple alignments', () => {
      const stockholm = `# STOCKHOLM 1.0
seq1  ACDEF
//
# STOCKHOLM 1.0
seq2  GHIKL
//`
      expect(() => parse(stockholm)).toThrow('More than one alignment found')
    })
  })
})

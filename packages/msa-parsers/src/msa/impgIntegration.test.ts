import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA.ts'
import FastaMSA from './FastaMSA.ts'
import { parseMSA } from './index.ts'

// impg (https://github.com/pangenome/impg) pipes `impg query -o fasta-aln` into
// scripts/faln2html.py, which feeds the FASTA string to
// MSAModelF().create({ data: { msa } }). These tests pin the behavior that
// integration relies on.

describe('impg fasta-aln integration', () => {
  // PanSN-style names + region coordinates with colons, dash gaps, uppercase
  const block = `>HG002#1#chr1:1000-1040
ACGTACGT--ACGTNNNNACGTACGTACGTACGTACGT
>HG003#1#chr1:1000-1040
ACGTAC-TGGACGTNNNNACGTAC--ACGTACGTACGT
>CHM13#0#chr1:1000-1040
ACGTACGTGGACGTNNNNACGT----ACGTACGTACGT`

  test('uppercase block is parsed as FASTA, not A3M/Clustal', () => {
    const msa = parseMSA(block)
    expect(msa).toBeInstanceOf(FastaMSA)
    expect(msa.getNames()).toEqual([
      'HG002#1#chr1:1000-1040',
      'HG003#1#chr1:1000-1040',
      'CHM13#0#chr1:1000-1040',
    ])
    expect(msa.getWidth()).toBe(38)
  })

  test('rows are retrievable by their colon-containing region name', () => {
    const msa = parseMSA(block)
    expect(msa.getRow('HG002#1#chr1:1000-1040')).toBe(
      'ACGTACGT--ACGTNNNNACGTACGTACGTACGTACGT',
    )
  })

  // If impg extracts from a soft-masked reference FASTA, aligned rows carry
  // lowercase bases. A3M sniff runs before FASTA and triggers on
  // hasLowercase && equal upper+dash match-length across rows -- which these
  // rows satisfy by coincidence. The rows are all the same total length though,
  // so they are a real alignment and must parse as FASTA, not A3M (A3M would
  // strip the lowercase into separate insert columns and break alignment).
  const softMasked = `>HG002#1#chr1:1000-1030
acgtACGTAC--GTACGTACGTACGTacgt
>HG003#1#chr1:1000-1030
ACGTacgtAC--GTACGTacgtACGTACGT`

  test('soft-masked equal-length block parses as FASTA, not A3M', () => {
    const msa = parseMSA(softMasked)
    expect(msa).toBeInstanceOf(FastaMSA)
    expect(msa).not.toBeInstanceOf(A3mMSA)
    const rows = msa.getNames().map(n => msa.getRow(n))
    expect(new Set(rows.map(r => r.length)).size).toBe(1)
  })
})

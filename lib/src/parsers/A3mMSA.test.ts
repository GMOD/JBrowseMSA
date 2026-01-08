import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA'

const exampleA3M = `>example
ETESMKTVRIREKIKKFLGDRPRNTAEILEHINSTMRHGTTSQQLGNVLSKDKDIVKVGYIKRSGILSGGYDICEWATRNWVAEHCPEWTE
>1
----MRTTRLRQKIKKFLNERGeANTTEILEHVNSTMRHGTTPQQLGNVLSKDKDILKVATTKRGGALSGRYEICVWTLRP-----------
>2
----MDSQNLRDLIRNYLSERPRNTIEISAWLASQMDPNSCPEDVTNILEADESIVRIGTVRKSGMRLTDLPISEWASSSWVRRHE-----
>3
----MNSQNLRELIRNYLSERPRNTIEISTWLSSQIDPTNSPVDITSILEADDQIVRIGTVRKSGMRRSESPVSEWASNTWVKHHE-----
>4
--RDMDTEKVREIVRNYISERPRNTAEIAAWLNRH-DDGTGGSDVAAILESDGSFVRIGTVRTSGMTGNSPPLSEWATEKWIQHHER----
>5
-----RTRRLREAVLVFLEEKGnANTVEVFDYLNERFRWGATMNQVGNILAKDTRFAKVGHQ-RGQFRGSVYTVCVWALS------------
>6
-----RTKRLREAVRVYLAENGrSHTVDIFDHLNDRFSWGATMNQVGNILAKDNRFEKVGHVRD-FFRGARYTVCVWDLAS-----------
`

describe('A3mMSA', () => {
  test('sniff detects A3M format', () => {
    expect(A3mMSA.sniff(exampleA3M)).toBe(true)
  })

  test('sniff returns false for regular FASTA', () => {
    const fasta = `>seq1
ACDEFGHIKLMNPQRST
>seq2
ACDEFGHIKLMNPQRST
`
    expect(A3mMSA.sniff(fasta)).toBe(false)
  })

  test('sniff returns false for non-FASTA formats', () => {
    expect(A3mMSA.sniff('# STOCKHOLM 1.0\n')).toBe(false)
    expect(A3mMSA.sniff('CLUSTAL W')).toBe(false)
  })

  test('parses A3M and expands insertions', () => {
    const parser = new A3mMSA(exampleA3M)
    const names = parser.getNames()

    expect(names).toEqual(['example', '1', '2', '3', '4', '5', '6'])

    // All sequences should have the same length after expansion
    const widths = names.map(name => parser.getRow(name).length)
    expect(widths.every(w => w === widths[0])).toBe(true)

    // The width should be greater than the original due to expanded inserts
    expect(parser.getWidth()).toBeGreaterThan(90)
  })

  test('lowercase inserts become uppercase after expansion', () => {
    const parser = new A3mMSA(exampleA3M)

    // The expanded sequences should not contain lowercase letters
    for (const name of parser.getNames()) {
      const row = parser.getRow(name)
      expect(/[a-z]/.test(row)).toBe(false)
    }
  })

  test('handles simple A3M with single insert', () => {
    const simple = `>seq1
ACDaEF
>seq2
ACD-EF
`
    const parser = new A3mMSA(simple)

    // seq1 has an 'a' insert after 'D', seq2 doesn't
    // After expansion, both should be same length
    const seq1 = parser.getRow('seq1')
    const seq2 = parser.getRow('seq2')

    expect(seq1.length).toBe(seq2.length)
    expect(seq1).toBe('ACDAEF')
    expect(seq2).toBe('ACD.EF')
  })

  test('handles multiple inserts at different positions', () => {
    const multi = `>seq1
ACDabEFghI
>seq2
ACD--EF--I
`
    const parser = new A3mMSA(multi)

    const seq1 = parser.getRow('seq1')
    const seq2 = parser.getRow('seq2')

    expect(seq1.length).toBe(seq2.length)
    // seq1: ACD + ab (inserts) + EF + gh (inserts) + I
    // seq2: ACD + -- + EF + -- + I -> needs . padding at insert positions
    expect(seq1).toBe('ACDABEFGHI')
    expect(seq2).toBe('ACD..EF..I')
  })

  test('handles varying insert lengths', () => {
    const varying = `>seq1
ACDabcEF
>seq2
ACDaEF
>seq3
ACDEF
`
    const parser = new A3mMSA(varying)

    const seq1 = parser.getRow('seq1')
    const seq2 = parser.getRow('seq2')
    const seq3 = parser.getRow('seq3')

    // All should have same length
    expect(seq1.length).toBe(seq2.length)
    expect(seq2.length).toBe(seq3.length)

    // seq1 has 3 inserts, seq2 has 1, seq3 has 0
    // After expansion with max 3 insert slots:
    expect(seq1).toBe('ACDABCEF')
    expect(seq2).toBe('ACDA..EF')
    expect(seq3).toBe('ACD...EF')
  })

  test('getTree returns flat tree structure', () => {
    const parser = new A3mMSA(exampleA3M)
    const tree = parser.getTree()

    expect(tree.id).toBe('root')
    expect(tree.noTree).toBe(true)
    expect(tree.children.length).toBe(7)
    expect(tree.children.map(c => c.name)).toEqual([
      'example',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ])
  })

  test('getWidth returns consistent width', () => {
    const parser = new A3mMSA(exampleA3M)
    const width = parser.getWidth()

    for (const name of parser.getNames()) {
      expect(parser.getRow(name).length).toBe(width)
    }
  })

  test('getMSA returns parsed data', () => {
    const parser = new A3mMSA(exampleA3M)
    const msa = parser.getMSA()

    expect(msa.seqdata).toBeDefined()
    expect(Object.keys(msa.seqdata).length).toBe(7)
  })
})

import { describe, expect, test } from 'vitest'

import { annotationsToGFF } from './annotationsToGFF.ts'
import { gffToAnnotations } from './gffToAnnotations.ts'
import { interProResponseToGFF, interProToGFF } from './interProToGFF.ts'
import { parseGFF } from './parseGFF.ts'

import type { InterProScanResults } from '../types.ts'

describe('interProToGFF', () => {
  test('converts empty results', () => {
    const gff = interProToGFF({})
    expect(gff).toBe('##gff-version 3')
  })

  test('converts single result', () => {
    const results: Record<string, InterProScanResults> = {
      seq1: {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00001',
                name: '7tm_1',
                description: 'GPCR family',
              },
            },
            locations: [{ start: 10, end: 50 }],
          },
        ],
        xref: [{ id: 'seq1' }],
      },
    }
    const gff = interProToGFF(results)
    const lines = gff.split('\n')

    expect(lines[0]).toBe('##gff-version 3')
    expect(lines[1]).toContain('seq1')
    expect(lines[1]).toContain('InterProScan')
    expect(lines[1]).toContain('protein_match')
    expect(lines[1]).toContain('10')
    expect(lines[1]).toContain('50')
    expect(lines[1]).toContain('Name=PF00001')
    expect(lines[1]).toContain('signature_desc=7tm_1')
    expect(lines[1]).toContain('description=GPCR%20family')
  })

  test('handles multiple locations', () => {
    const results: Record<string, InterProScanResults> = {
      seq1: {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00001',
                name: 'domain',
                description: 'test',
              },
            },
            locations: [
              { start: 10, end: 50 },
              { start: 100, end: 150 },
            ],
          },
        ],
        xref: [{ id: 'seq1' }],
      },
    }
    const gff = interProToGFF(results)
    const lines = gff.split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('10\t50')
    expect(lines[2]).toContain('100\t150')
  })

  test('handles multiple sequences', () => {
    const results: Record<string, InterProScanResults> = {
      seq1: {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00001',
                name: 'domain1',
                description: 'test1',
              },
            },
            locations: [{ start: 10, end: 50 }],
          },
        ],
        xref: [{ id: 'seq1' }],
      },
      seq2: {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00002',
                name: 'domain2',
                description: 'test2',
              },
            },
            locations: [{ start: 5, end: 40 }],
          },
        ],
        xref: [{ id: 'seq2' }],
      },
    }
    const gff = interProToGFF(results)
    const lines = gff.split('\n')

    expect(lines).toHaveLength(3)
    expect(lines.some(l => l.includes('seq1'))).toBe(true)
    expect(lines.some(l => l.includes('seq2'))).toBe(true)
  })

  test('keeps an unintegrated signature, which has no InterPro entry', () => {
    // what InterProScan writes for every MobiDBLite hit, and for any member
    // database signature InterPro has not integrated yet
    const results: Record<string, InterProScanResults> = {
      seq1: {
        matches: [
          {
            signature: {
              accession: 'mobidb-lite',
              name: 'disorder_prediction',
              description: null,
              entry: null,
            },
            locations: [{ start: 10, end: 50 }],
          },
        ],
        xref: [{ id: 'seq1' }],
      },
    }
    const lines = interProToGFF(results).split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('Name=mobidb-lite')
    expect(lines[1]).toContain('signature_desc=disorder_prediction')
  })

  test('writes header lines as comments under the version directive', () => {
    const gff = annotationsToGFF(
      [
        {
          id: 'seq1',
          accession: 'PF00001',
          name: '7tm_1',
          description: '7tm_1',
          start: 1,
          end: 9,
        },
      ],
      ['precomputed InterPro 110.0 pfam matches'],
    )
    expect(gff.split('\n').slice(0, 2)).toEqual([
      '##gff-version 3',
      '# precomputed InterPro 110.0 pfam matches',
    ])
  })

  test('skips a match whose signature has no accession', () => {
    const results: Record<string, InterProScanResults> = {
      seq1: {
        matches: [{ signature: {}, locations: [{ start: 10, end: 50 }] }],
        xref: [{ id: 'seq1' }],
      },
    }
    expect(interProToGFF(results)).toBe('##gff-version 3')
  })

  test('round-trips the feature type and strand of a gene-structure overlay', () => {
    const gff = [
      'seq1\tRefSeq\tmRNA\t1\t99\t.\t+\t.\tName=NM_1',
      'seq1\tRefSeq\texon\t1\t30\t.\t+\t.\tName=exon-1',
    ].join('\n')
    const rows = annotationsToGFF(gffToAnnotations(parseGFF(gff)))
      .split('\n')
      .slice(1)
      .map(l => l.split('\t'))

    // the gene keeps its type and direction (it draws as an arrow); the exon
    // keeps its type (it draws as a numbered segment, not a categorical domain)
    expect(rows.map(r => [r[2], r[6]])).toEqual([
      ['mRNA', '+'],
      ['exon', '.'],
    ])
  })

  test('URL-encodes special characters in attributes', () => {
    const results: Record<string, InterProScanResults> = {
      seq1: {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00001',
                name: 'test;name=value',
                description: 'description with spaces',
              },
            },
            locations: [{ start: 10, end: 50 }],
          },
        ],
        xref: [{ id: 'seq1' }],
      },
    }
    const gff = interProToGFF(results)

    expect(gff).toContain('signature_desc=test%3Bname%3Dvalue')
    expect(gff).toContain('description=description%20with%20spaces')
  })
})

describe('interProResponseToGFF', () => {
  test('converts array of results', () => {
    const results: InterProScanResults[] = [
      {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00001',
                name: 'domain',
                description: 'test',
              },
            },
            locations: [{ start: 10, end: 50 }],
          },
        ],
        xref: [{ id: 'seq1' }],
      },
    ]
    const gff = interProResponseToGFF(results)

    expect(gff).toContain('##gff-version 3')
    expect(gff).toContain('seq1')
  })

  test('handles results without xref', () => {
    const results: InterProScanResults[] = [
      {
        matches: [
          {
            signature: {
              entry: {
                accession: 'PF00001',
                name: 'domain',
                description: 'test',
              },
            },
            locations: [{ start: 10, end: 50 }],
          },
        ],
        xref: [],
      },
    ]
    const gff = interProResponseToGFF(results)

    expect(gff).toBe('##gff-version 3')
  })
})

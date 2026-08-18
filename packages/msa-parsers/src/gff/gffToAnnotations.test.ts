import { expect, test } from 'vitest'

import { gffToAnnotations } from './gffToAnnotations.ts'

import type { GFFRecord } from '../types.ts'

function record(fields: Partial<GFFRecord> = {}): GFFRecord {
  return {
    seq_id: 'seq1',
    source: 'Pfam',
    type: 'protein_match',
    start: 10,
    end: 50,
    score: 0,
    strand: '.',
    phase: '.',
    ...fields,
  }
}

test('converts empty array', () => {
  expect(gffToAnnotations([])).toEqual([])
})

test('maps a record onto the annotation fields', () => {
  expect(
    gffToAnnotations([
      record({
        Name: 'PF00001',
        signature_desc: '7tm_1',
        description: 'GPCR family',
      }),
    ]),
  ).toEqual([
    {
      id: 'seq1',
      accession: 'PF00001',
      name: '7tm_1',
      description: 'GPCR family',
      featureType: 'protein_match',
      start: 10,
      end: 50,
      strand: undefined,
    },
  ])
})

test('keeps one annotation per record, in file order', () => {
  const annotations = gffToAnnotations([
    record({ Name: 'PF00001', start: 10, end: 50 }),
    record({ Name: 'PF00001', start: 100, end: 150 }),
    record({ seq_id: 'seq2', Name: 'PF00002', start: 5, end: 40 }),
  ])
  expect(annotations.map(a => [a.id, a.accession, a.start, a.end])).toEqual([
    ['seq1', 'PF00001', 10, 50],
    ['seq1', 'PF00001', 100, 150],
    ['seq2', 'PF00002', 5, 40],
  ])
})

test('gives gene-level features a direction but leaves exons/domains as blocks', () => {
  const annotations = gffToAnnotations([
    record({ type: 'gene', strand: '+', Name: 'GENEA' }),
    record({ type: 'mRNA', strand: '-', Name: 'GENEB' }),
    record({ type: 'exon', strand: '+', Name: 'exon-1' }),
    record({ type: 'protein_match', strand: '+', Name: 'PF00001' }),
  ])
  expect(
    Object.fromEntries(annotations.map(a => [a.accession, a.strand])),
  ).toEqual({
    GENEA: 1, // + gene -> arrow right
    GENEB: -1, // - gene -> arrow left
    'exon-1': undefined, // exon stays a block even though it is stranded
    PF00001: undefined, // protein domain stays a block
  })
})

test('falls back from Name to ID to source and positions', () => {
  expect(
    gffToAnnotations([
      record({ ID: 'domain_123' }),
      record({ source: 'CustomSource' }),
    ]).map(a => a.accession),
  ).toEqual(['domain_123', 'CustomSource_10_50'])
})

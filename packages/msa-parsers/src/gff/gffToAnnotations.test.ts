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
      color: undefined,
      attributes: {
        Name: 'PF00001',
        signature_desc: '7tm_1',
        description: 'GPCR family',
      },
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
    record({ type: 'CDS', strand: '-', Name: 'orfA' }),
    record({ type: 'exon', strand: '+', Name: 'exon-1' }),
    record({ type: 'protein_match', strand: '+', Name: 'PF00001' }),
  ])
  expect(
    Object.fromEntries(annotations.map(a => [a.accession, a.strand])),
  ).toEqual({
    GENEA: 1, // + gene -> arrow right
    GENEB: -1, // - gene -> arrow left
    orfA: -1, // a prokaryotic gene is a CDS row
    'exon-1': undefined, // exon stays a block even though it is stranded
    PF00001: undefined, // protein domain stays a block
  })
})

test('drops the line describing the whole scanned sequence', () => {
  expect(
    gffToAnnotations([
      record({ type: 'polypeptide', source: '.', md5: 'fd0743a673ac69fb' }),
      record({ Name: 'PF00001' }),
    ]).map(a => a.accession),
  ).toEqual(['PF00001'])
})

test('describes a domain by its signature, not by its GO terms', () => {
  expect(
    gffToAnnotations([
      record({
        Name: 'PF00634',
        signature_desc: 'BRCA2 repeat',
        Ontology_term: 'GO:0003677 GO:0006281',
      }),
    ])[0]?.description,
  ).toBe('BRCA2 repeat')
})

test('falls back from Name to ID to source and positions', () => {
  expect(
    gffToAnnotations([
      record({ ID: 'domain_123' }),
      record({ source: 'CustomSource' }),
    ]).map(a => a.accession),
  ).toEqual(['domain_123', 'CustomSource_10_50'])
})

test('keeps the column 9 attributes, so a channel can encode one of them', () => {
  expect(
    gffToAnnotations([record({ type: 'gene', Name: 'trpB', gene: 'trpB' })])[0]
      ?.attributes,
  ).toEqual({ Name: 'trpB', gene: 'trpB' })
})

test('reads a color attribute under any of its spellings', () => {
  expect(
    gffToAnnotations([
      record({ color: '#ff0000' }),
      record({ colour: 'rebeccapurple' }),
      record({ Color: '#00ff00' }),
      record({ Colour: 'blue' }),
      record({}),
    ]).map(a => a.color),
  ).toEqual(['#ff0000', 'rebeccapurple', '#00ff00', 'blue', undefined])
})

test('normalizes an RGB triple, which the attribute parser hands over space-separated', () => {
  expect(
    gffToAnnotations([
      record({ color: '255 0 0' }),
      record({ color: '0,128,255' }),
    ]).map(a => a.color),
  ).toEqual(['rgb(255,0,0)', 'rgb(0,128,255)'])
})

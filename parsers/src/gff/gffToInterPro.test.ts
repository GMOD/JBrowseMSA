import { describe, expect, test } from 'vitest'

import { gffToInterProResponse, gffToInterProResults } from './gffToInterPro'

import type { GFFRecord } from '../types'

describe('gffToInterProResults', () => {
  test('converts empty array', () => {
    expect(gffToInterProResults([])).toEqual({})
  })

  test('converts single GFF record', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'Pfam',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00001',
        signature_desc: '7tm_1',
        description: 'GPCR family',
      },
    ]
    const result = gffToInterProResults(records)

    expect(result).toHaveProperty('seq1')
    expect(result.seq1?.matches).toHaveLength(1)
    expect(result.seq1?.matches[0]?.signature.entry).toEqual({
      accession: 'PF00001',
      name: '7tm_1',
      description: 'GPCR family',
    })
    expect(result.seq1?.matches[0]?.locations).toEqual([{ start: 10, end: 50 }])
    expect(result.seq1?.xref).toEqual([{ id: 'seq1' }])
  })

  test('groups multiple records for same sequence', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'Pfam',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00001',
      },
      {
        seq_id: 'seq1',
        source: 'SMART',
        type: 'protein_match',
        start: 60,
        end: 100,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'SM00001',
      },
    ]
    const result = gffToInterProResults(records)

    expect(Object.keys(result)).toHaveLength(1)
    expect(result.seq1?.matches).toHaveLength(2)
  })

  test('handles multiple sequences', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'Pfam',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00001',
      },
      {
        seq_id: 'seq2',
        source: 'Pfam',
        type: 'protein_match',
        start: 5,
        end: 40,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00002',
      },
    ]
    const result = gffToInterProResults(records)

    expect(Object.keys(result)).toHaveLength(2)
    expect(result).toHaveProperty('seq1')
    expect(result).toHaveProperty('seq2')
  })

  test('combines locations for same accession', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'Pfam',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00001',
      },
      {
        seq_id: 'seq1',
        source: 'Pfam',
        type: 'protein_match',
        start: 100,
        end: 150,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00001',
      },
    ]
    const result = gffToInterProResults(records)

    expect(result.seq1?.matches).toHaveLength(1)
    expect(result.seq1?.matches[0]?.locations).toHaveLength(2)
    expect(result.seq1?.matches[0]?.locations).toEqual([
      { start: 10, end: 50 },
      { start: 100, end: 150 },
    ])
  })

  test('uses ID as fallback for Name', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'Source',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
        ID: 'domain_123',
      },
    ]
    const result = gffToInterProResults(records)

    expect(result.seq1?.matches[0]?.signature.entry?.accession).toBe(
      'domain_123',
    )
  })

  test('generates fallback accession from source and positions', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'CustomSource',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
      },
    ]
    const result = gffToInterProResults(records)

    expect(result.seq1?.matches[0]?.signature.entry?.accession).toBe(
      'CustomSource_10_50',
    )
  })
})

describe('gffToInterProResponse', () => {
  test('wraps results in response format', () => {
    const records: GFFRecord[] = [
      {
        seq_id: 'seq1',
        source: 'Pfam',
        type: 'protein_match',
        start: 10,
        end: 50,
        score: 0,
        strand: '.',
        phase: '.',
        Name: 'PF00001',
      },
    ]
    const response = gffToInterProResponse(records)

    expect(response).toHaveProperty('results')
    expect(response.results).toHaveLength(1)
    expect(response.results[0]?.xref[0]?.id).toBe('seq1')
  })
})

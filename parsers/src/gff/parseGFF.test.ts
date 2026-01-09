import { describe, expect, test } from 'vitest'

import { parseGFF } from './parseGFF'

describe('parseGFF', () => {
  test('parses empty string', () => {
    expect(parseGFF('')).toEqual([])
    expect(parseGFF(undefined)).toEqual([])
  })

  test('parses basic GFF3 line', () => {
    const gff =
      'seq1\tInterProScan\tprotein_match\t10\t50\t.\t+\t.\tName=PF00001'
    const result = parseGFF(gff)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      seq_id: 'seq1',
      source: 'InterProScan',
      type: 'protein_match',
      start: 10,
      end: 50,
      score: 0,
      strand: '+',
      phase: '.',
      Name: 'PF00001',
    })
  })

  test('parses multiple attributes', () => {
    const gff =
      'seq1\tPfam\tprotein_match\t10\t50\t1.5\t.\t.\tName=PF00001;signature_desc=7tm_1;description=GPCR'
    const result = parseGFF(gff)
    expect(result[0]).toMatchObject({
      Name: 'PF00001',
      signature_desc: '7tm_1',
      description: 'GPCR',
    })
  })

  test('handles URL-encoded attribute values', () => {
    const gff = 'seq1\tSource\ttype\t1\t10\t.\t.\t.\tNote=Hello%20World%3B%3D'
    const result = parseGFF(gff)
    expect(result[0]?.Note).toBe('Hello World;=')
  })

  test('skips comment lines', () => {
    const gff = `##gff-version 3
# This is a comment
seq1\tSource\ttype\t1\t10\t.\t.\t.\tName=test`
    const result = parseGFF(gff)
    expect(result).toHaveLength(1)
    expect(result[0]?.seq_id).toBe('seq1')
  })

  test('skips empty lines', () => {
    const gff = `seq1\tSource\ttype\t1\t10\t.\t.\t.\tName=test1

seq2\tSource\ttype\t20\t30\t.\t.\t.\tName=test2`
    const result = parseGFF(gff)
    expect(result).toHaveLength(2)
  })

  test('handles missing attributes column', () => {
    const gff = 'seq1\tSource\ttype\t1\t10\t.\t.\t.'
    const result = parseGFF(gff)
    expect(result).toHaveLength(1)
    expect(result[0]?.seq_id).toBe('seq1')
  })

  test('handles partial GFF lines gracefully', () => {
    const gff = 'seq1\tSource\ttype'
    const result = parseGFF(gff)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      seq_id: 'seq1',
      source: 'Source',
      type: 'type',
      start: 0,
      end: 0,
    })
  })

  test('parses numeric score', () => {
    const gff = 'seq1\tSource\ttype\t1\t10\t45.6\t.\t.\tName=test'
    const result = parseGFF(gff)
    expect(result[0]?.score).toBe(45.6)
  })

  test('handles comma-separated values in attributes', () => {
    const gff =
      'seq1\tSource\ttype\t1\t10\t.\t.\t.\tOntology_term=GO:0001,GO:0002'
    const result = parseGFF(gff)
    expect(result[0]?.Ontology_term).toBe('GO:0001 GO:0002')
  })

  test('parses multiple lines', () => {
    const gff = `seq1\tPfam\tprotein_match\t10\t50\t.\t.\t.\tName=PF00001
seq1\tSMART\tprotein_match\t60\t100\t.\t.\t.\tName=SM00001
seq2\tPfam\tprotein_match\t5\t40\t.\t.\t.\tName=PF00002`
    const result = parseGFF(gff)
    expect(result).toHaveLength(3)
    expect(result[0]?.seq_id).toBe('seq1')
    expect(result[1]?.seq_id).toBe('seq1')
    expect(result[2]?.seq_id).toBe('seq2')
  })
})

import { describe, expect, test } from 'vitest'

import { parseGFF } from './parseGFF.ts'

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

  test('skips a line that is short of the mandatory columns', () => {
    expect(parseGFF('seq1\tSource\ttype')).toEqual([])
  })

  test('reads an InterProScan GFF3, stopping at its FASTA section', () => {
    const gff = `##gff-version 3
##feature-ontology http://song.cvs.sourceforge.net/viewvc/song/ontology/sofa.obo?revision=1.269
##interproscan-version 5.26-65.0
##sequence-region P51587 1 30
##seqid|source|type|start|end|score|strand|phase|attributes
P51587\t.\tpolypeptide\t1\t30\t.\t+\t.\tmd5=fd0743a673ac69fb;ID=P51587
P51587\tPfam\tprotein_match\t5\t20\t1.2E-45\t+\t.\tName=PF00634;signature_desc=BRCA2 repeat;Target=null 5 20;status=T;ID=match$8_5_20;Ontology_term="GO:0003677","GO:0006281";date=15-04-2013;Dbxref="InterPro:IPR002093"
##FASTA
>P51587
MPIGSKERPTFFEIFKTRCNKADLGPISLN
`
    const records = parseGFF(gff)
    expect(records.map(r => [r.type, r.start, r.end])).toEqual([
      ['polypeptide', 1, 30],
      ['protein_match', 5, 20],
    ])
    expect(records[1]?.Ontology_term).toBe('GO:0003677 GO:0006281')
    expect(records[1]?.Dbxref).toBe('InterPro:IPR002093')
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

  test('does not throw on a stray percent sign', () => {
    const gff = 'seq1\tSource\ttype\t1\t10\t.\t.\t.\tNote=100%done'
    const result = parseGFF(gff)
    expect(result[0]?.Note).toBe('100%done')
  })

  test('decodes a percent-encoded seq_id', () => {
    const result = parseGFF(
      'HBA%2FHUMAN/27-137\tsrc\tgene\t1\t5\t.\t+\t.\tName=x',
    )
    expect(result[0]?.seq_id).toBe('HBA/HUMAN/27-137')
  })

  test('drops an attribute with no value', () => {
    const result = parseGFF('a\tsrc\tgene\t1\t5\t.\t+\t.\tName=x;flag;Note=')
    expect(Object.keys(result[0]!)).not.toContain('flag')
    expect(Object.keys(result[0]!)).not.toContain('Note')
    expect(result[0]?.Name).toBe('x')
  })

  test('keeps text after a second equals sign', () => {
    const gff = 'seq1\tSource\ttype\t1\t10\t.\t.\t.\tNote=a=b'
    const result = parseGFF(gff)
    expect(result[0]?.Note).toBe('a=b')
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

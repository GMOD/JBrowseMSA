import { describe, expect, it } from 'vitest'

import {
  genArkBase,
  genArkConfigUrl,
  parseChromAlias,
  parseGeneTableBlocks,
  pickGeneTrack,
} from './speciesGenes'

// A trimmed gene_table for a + strand gene: one 5' UTR-only exon, then three
// coding exons (the last partially coding). Columns are tab-separated the way
// efetch emits them, with empty "coding" columns collapsed to double tabs. The
// genomic-coding column (2nd genomic interval, when it sits inside the exon
// interval) is what the parser turns into CDS.
const geneTablePlus = [
  'Some Gene [Homo sapiens]',
  'Gene ID: 1, updated on 01-Jan-2026',
  '',
  'Reference GRCx NC_000001.1  from: 100 to: 600',
  'mRNA transcript variant 1 NM_000001.1, 4 exons',
  'protein isoform a NP_000001.1, 3 coding  exons,  annotated AA length: 67',
  '',
  'Exon table for  mRNA  NM_000001.1 and protein NP_000001.1',
  'Genomic Interval Exon\t\tGenomic Interval Coding\t\tExon Length',
  '-----------------------------------------------------------------',
  '50-99\t\t1-50\t\t50', // 5' UTR exon: 2nd token is a gene interval, skipped
  '100-200\t\t150-200\t\t101', // coding 150-200 -> interbase [149,200], len 51
  '300-400\t\t300-400\t\t101', // fully coding -> [299,400], len 101
  '500-600\t\t500-550\t\t101', // partial coding -> [499,550], len 51
].join('\n')

describe('parseGeneTableBlocks', () => {
  it('extracts genomic CDS intervals as interbase, skipping UTR-only exons', () => {
    const [tx] = parseGeneTableBlocks(geneTablePlus, 1)
    expect(tx.mrna).toBe('NM_000001.1')
    expect(tx.protein).toBe('NP_000001.1')
    expect(tx.cds.map(c => [c.start, c.end])).toEqual([
      [149, 200],
      [299, 400],
      [499, 550],
    ])
  })

  it('assigns GFF phases from the running coding length on the + strand', () => {
    const [tx] = parseGeneTableBlocks(geneTablePlus, 1)
    // lengths 51, 101, 51: phase 0, then (3-51%3)=0, then (3-152%3)=1
    expect(tx.cds.map(c => c.phase)).toEqual([0, 0, 1])
  })

  it('phases in translation order on the − strand (reversed genomic order)', () => {
    const [tx] = parseGeneTableBlocks(geneTablePlus, -1)
    // translation starts at the highest-coordinate exon: [499,550] len 51 ->
    // phase 0, [299,400] len 101 -> phase 0, [149,200] -> (3-152%3)=1; the array
    // stays genomic-ascending, so the first entry carries the last phase
    expect(tx.cds.map(c => c.phase)).toEqual([1, 0, 0])
  })

  it('normalizes minus-strand high-to-low intervals to genomic ascending', () => {
    // NCBI lists − strand rows high-to-low (e.g. 600-500); the exon and coding
    // intervals both descend. The parser must still emit ascending CDS.
    const minusTable = [
      'Reference GRCx NC_000002.1  from: 300 to: 700',
      '',
      'Exon table for  mRNA  NM_000002.1 and protein NP_000002.1',
      'Genomic Interval Exon\t\tGenomic Interval Coding\t\tExon Length',
      '----',
      '700-650\t\t90000-90050\t\t51', // UTR: gene interval outside the exon
      '600-500\t\t550-500\t\t101', // coding 550-500 -> [499,550]
      '400-300\t\t400-300\t\t101', // coding -> [299,400]
    ].join('\n')
    const [tx] = parseGeneTableBlocks(minusTable, -1)
    expect(tx.cds.map(c => [c.start, c.end])).toEqual([
      [299, 400],
      [499, 550],
    ])
    // no negative-length CDS
    expect(tx.cds.every(c => c.end > c.start)).toBe(true)
  })
})

describe('genArkBase', () => {
  it('lays a GenArk accession out by digit triplets on hgdownload', () => {
    expect(genArkBase('GCF_000001635.27')).toBe(
      'https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/635/GCF_000001635.27/GCF_000001635.27',
    )
  })

  it('handles GCA accessions too', () => {
    expect(genArkBase('GCA_000001215.4')).toContain('/hubs/GCA/000/001/215/')
  })
})

describe('genArkConfigUrl', () => {
  it('shards the jb2hubs config path the same way', () => {
    expect(genArkConfigUrl('GCF_000001635.27')).toBe(
      'https://jbrowse.org/hubs/genark/GCF/000/001/635/GCF_000001635.27/config.json',
    )
  })
})

describe('pickGeneTrack', () => {
  const acc = 'GCF_000001215.4'
  it('prefers RefSeq Select, then curated, then the full set', () => {
    expect(
      pickGeneTrack(acc, [`${acc}-ncbiGff`, `${acc}-ncbiRefSeqSelect`]),
    ).toBe(`${acc}-ncbiRefSeqSelect`)
    // fly and worm configs carry no Select track
    expect(
      pickGeneTrack(acc, [
        `${acc}-ncbiRefSeq`,
        `${acc}-ncbiRefSeqCurated`,
        `${acc}-ncbiGff`,
      ]),
    ).toBe(`${acc}-ncbiRefSeqCurated`)
  })

  it('returns undefined when the config has no NCBI gene track', () => {
    expect(pickGeneTrack(acc, [`${acc}-repeatMasker`])).toBeUndefined()
  })
})

describe('parseChromAlias', () => {
  // the UCSC chromAlias layout: a commented header naming each column's scheme
  const text = [
    '# refseq\tassembly\tgenbank\tncbi\tucsc',
    'NC_000067.7\t1\tCM000994.3\t1\tchr1',
    'NC_000077.7\t11\tCM001004.3\t11\tchr11',
    'NT_166280.1\t\tGL456210.1\t\tchr1_GL456210v1_random',
  ].join('\n')

  it('maps every alias to the canonical column, which maps to itself', () => {
    const map = parseChromAlias(text, 'ucsc')
    expect(map.get('NC_000077.7')).toBe('chr11')
    expect(map.get('CM001004.3')).toBe('chr11')
    expect(map.get('chr11')).toBe('chr11')
    expect(map.get('NT_166280.1')).toBe('chr1_GL456210v1_random')
  })

  it('rejects a canonical column the header does not name', () => {
    expect(() => parseChromAlias(text, 'ensembl')).toThrow(/ensembl/)
  })
})

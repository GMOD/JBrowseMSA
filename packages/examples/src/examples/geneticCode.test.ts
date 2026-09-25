import { describe, expect, test } from 'vitest'

import f12CdsMSA from '../../data/f12-cetacean-cds.stock?raw'
import {
  classify,
  compareCodons,
  geneticCode,
  readingFrame,
  translate,
} from './geneticCode'

describe('geneticCode', () => {
  test('holds 64 codons, three of them stops', () => {
    expect(Object.keys(geneticCode)).toHaveLength(64)
    expect(
      Object.entries(geneticCode)
        .filter(([, aminoAcid]) => aminoAcid === '*')
        .map(([codon]) => codon)
        .sort(),
    ).toEqual(['TAA', 'TAG', 'TGA'])
    expect(geneticCode.ATG).toBe('M')
    expect(geneticCode.TGG).toBe('W')
    expect(['GCT', 'GCC', 'GCA', 'GCG'].map(c => geneticCode[c])).toEqual([
      'A',
      'A',
      'A',
      'A',
    ])
  })

  test('translate reads either case and RNA, and gives up on a gap or N', () => {
    expect(translate('atg')).toBe('M')
    expect(translate('AUG')).toBe('M')
    expect(translate('A-G')).toBeUndefined()
    expect(translate('ANG')).toBeUndefined()
  })
})

describe('readingFrame', () => {
  test('groups bases in threes across gaps and drops a partial codon', () => {
    expect(readingFrame('AT-GCAGT')).toEqual([
      [0, 1, 3],
      [4, 5, 6],
    ])
  })
})

describe('classify', () => {
  test.each([
    ['GAG', 'GAG', undefined],
    ['GAG', 'GAA', 'synonymous'],
    ['GAG', 'GAC', 'non-synonymous'],
    ['TGG', 'TGA', 'stop'],
    ['TAA', 'TAG', 'synonymous'],
    ['TAA', 'CAA', 'non-synonymous'],
    ['GAG', 'G-G', 'gapped'],
    ['GAG', '--G', 'gapped'],
    ['GAG', '---', undefined],
    ['GAG', 'GNG', undefined],
  ])('%s against %s', (reference, other, change) => {
    expect(classify(reference, other)).toBe(change)
  })
})

describe('compareCodons', () => {
  const rows = [
    { name: 'ref', sequence: 'ATGG-AGTGG' },
    { name: 'insert', sequence: 'ATGGCAGTGA' },
    { name: 'shift', sequence: 'ATGG--GTGG' },
  ]

  test('reads every row at the reference codon columns', () => {
    const codons = compareCodons(rows, 'ref')
    expect(
      codons.map(({ number, columns, codon, aminoAcid }) => ({
        number,
        columns,
        codon,
        aminoAcid,
      })),
    ).toEqual([
      { number: 1, columns: [0, 1, 2], codon: 'ATG', aminoAcid: 'M' },
      { number: 2, columns: [3, 5, 6], codon: 'GAG', aminoAcid: 'E' },
      { number: 3, columns: [7, 8, 9], codon: 'TGG', aminoAcid: 'W' },
    ])
    expect(codons[1]!.changes).toEqual([
      { row: 'shift', change: 'gapped', codon: 'G-G', start: 4, end: 5 },
    ])
    expect(codons[2]!.changes).toEqual([
      { row: 'insert', change: 'stop', codon: 'TGA', start: 8, end: 10 },
    ])
  })

  test('returns nothing for a row name the alignment lacks', () => {
    expect(compareCodons(rows, 'missing')).toEqual([])
  })

  test('finds the cetacean frameshift and stops in F12', () => {
    const f12 = f12CdsMSA
      .split('\n')
      .filter(line => line && !line.startsWith('#') && !line.startsWith('//'))
      .map(line => {
        const [name = '', sequence = ''] = line.split(/\s+/)
        return { name, sequence }
      })
    const cetaceans = ['minke_whale', 'dolphin', 'beluga', 'porpoise']
    const human = compareCodons(f12, 'human')
    const rowsWith = (number: number, change: string) =>
      human[number - 1]!.changes.filter(c => c.change === change).map(
        c => c.row,
      )
    expect(human).toHaveLength(616)
    expect(rowsWith(69, 'gapped')).toEqual(cetaceans)
    expect(rowsWith(391, 'stop')).toEqual(cetaceans)
    expect(rowsWith(521, 'stop')).toEqual(cetaceans)

    const dolphin = compareCodons(f12, 'dolphin')
    expect(dolphin.findIndex(c => c.aminoAcid === '*') + 1).toBe(94)
  })
})

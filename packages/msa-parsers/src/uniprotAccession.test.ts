import { expect, test } from 'vitest'

import { parseUniProtAccession } from './uniprotAccession.ts'

test('accepts both accession patterns, in either case', () => {
  expect(parseUniProtAccession('P04637')).toEqual({ accession: 'P04637' })
  expect(parseUniProtAccession('p04637')).toEqual({ accession: 'P04637' })
  expect(parseUniProtAccession('A0A023GPI8')).toEqual({
    accession: 'A0A023GPI8',
  })
})

test('splits an isoform or version suffix off', () => {
  expect(parseUniProtAccession('P04637-2')).toEqual({
    accession: 'P04637',
    suffix: '-2',
  })
  expect(parseUniProtAccession('P04637.4')).toEqual({
    accession: 'P04637',
    suffix: '.4',
  })
})

test('rejects entry names and RefSeq ids', () => {
  expect(parseUniProtAccession('P53_HUMAN')).toBeUndefined()
  expect(parseUniProtAccession('NP_000537.3')).toBeUndefined()
  expect(parseUniProtAccession('ENSP00000269305')).toBeUndefined()
})

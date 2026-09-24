import * as fs from 'node:fs'
import * as path from 'node:path'

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  buildResidueMappings,
  parseRowsTsv,
  parseStructure,
} from './residue-mappings.ts'

const fixtures = path.join(import.meta.dirname, 'test_data')

function fixture(name: string) {
  return fs.readFileSync(path.join(fixtures, name), 'utf8')
}

const ROUTES: Record<string, string> = {
  'https://rest.uniprot.org/uniprotkb/P0DTC2.fasta': 'uniprot-P0DTC2.fasta',
  'https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/6vxx':
    'pdbe-mappings-6vxx.json',
  'https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/6vxx':
    'pdbe-molecules-6vxx.json',
  'https://www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/6vxx/chain/A':
    'pdbe-polymer-coverage-6vxx-A.json',
  'https://alphafold.ebi.ac.uk/api/prediction/P0DTC2': 'alphafold-P0DTC2.json',
}

const SPIKE = fixture('uniprot-P0DTC2.fasta')
  .split('\n')
  .slice(1)
  .join('')
  .trim()

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async (url: string) => {
    const file = ROUTES[url]
    return file
      ? new Response(fixture(file), { status: 200 })
      : new Response('', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function gapped(seq: string) {
  return `${seq.slice(0, 20)}---${seq.slice(20)}`
}

function msa(rows: Record<string, string>) {
  return Object.entries(rows)
    .map(([name, seq]) => `>${name}\n${seq}`)
    .join('\n')
}

const DATE = '2026-09-24'

test('a full-length row maps through SIFTS, offset by the construct', async () => {
  const [mapping] = await buildResidueMappings({
    msaText: msa({ 'SARS-CoV-2': gapped(SPIKE), other: gapped(SPIKE) }),
    rows: [
      {
        row: 'SARS-CoV-2',
        accession: 'P0DTC2',
        structure: { pdb: '6VXX', chain: 'A' },
      },
    ],
    date: DATE,
  })
  expect(mapping).toEqual({
    row: 'SARS-CoV-2',
    accession: 'P0DTC2',
    structure: {
      id: '6VXX',
      kind: 'experimental',
      asymId: 'A',
      url: 'https://files.rcsb.org/download/6VXX.cif',
    },
    segments: [{ rowStart: 14, rowEnd: 1211, structStart: 33, structEnd: 1230 }],
    unobserved: [
      [1, 45],
      [89, 98],
      [163, 183],
      [192, 204],
      [265, 281],
      [464, 465],
      [474, 480],
      [488, 507],
      [521, 521],
      [640, 659],
      [696, 707],
      [847, 872],
      [1167, 1281],
    ],
    rowLength: 1273,
    generated: { by: 'sifts', date: DATE },
  })
})

test('the viewer accepts the mapping and looks residues up through it', async () => {
  const msaText = msa({ 'SARS-CoV-2': gapped(SPIKE), other: gapped(SPIKE) })
  const residueMappings = await buildResidueMappings({
    msaText,
    rows: [
      {
        row: 'SARS-CoV-2',
        accession: 'P0DTC2',
        structure: { pdb: '6VXX', chain: 'A' },
      },
    ],
  })
  const { MSAModelF } = await import('react-msaview')
  const model = MSAModelF().create({
    id: 'residue-mappings-test',
    type: 'MsaView',
    data: { msa: msaText },
    residueMappings,
  })
  expect(model.residueMappingProblems).toEqual([])
  expect(model.structureResidue('SARS-CoV-2', 682)).toMatchObject({
    position: 701,
    observed: false,
  })
  expect(model.structureResidue('SARS-CoV-2', 500)).toMatchObject({
    position: 519,
    observed: true,
  })
})

test('the furin loop, row 681-684, is mapped and unobserved', async () => {
  const [mapping] = await buildResidueMappings({
    msaText: msa({ 'SARS-CoV-2': SPIKE }),
    rows: parseRowsTsv('row\taccession\tstructure\nSARS-CoV-2\tP0DTC2\t6vxx:A\n'),
    date: DATE,
  })
  const [segment] = mapping!.segments
  const offset = segment!.structStart - segment!.rowStart
  expect(SPIKE.slice(680, 684)).toBe('PRRA')
  const loop = mapping!.unobserved!.find(
    ([start, end]) => start <= 681 + offset && 684 + offset <= end,
  )
  expect(loop).toEqual([696, 707])
})

test('a /start-end fragment row shifts every position by the fragment start', async () => {
  const row = 'SPIKE_SARS2/319-541'
  const [mapping] = await buildResidueMappings({
    msaText: msa({ [row]: SPIKE.slice(318, 541) }),
    rows: [
      { row, accession: 'P0DTC2', structure: { pdb: '6VXX', chain: 'A' } },
    ],
    date: DATE,
  })
  expect(mapping!.segments).toEqual([
    { rowStart: 1, rowEnd: 223, structStart: 338, structEnd: 560 },
  ])
  expect(mapping!.rowLength).toBe(223)
})

test('a fragment that SIFTS covers only in part is clipped to the mapped run', async () => {
  const row = 'SPIKE_SARS2/1-100'
  const [mapping] = await buildResidueMappings({
    msaText: msa({ [row]: SPIKE.slice(0, 100) }),
    rows: [
      { row, accession: 'P0DTC2', structure: { pdb: '6VXX', chain: 'A' } },
    ],
    date: DATE,
  })
  expect(mapping!.segments).toEqual([
    { rowStart: 14, rowEnd: 100, structStart: 33, structEnd: 119 },
  ])
})

test('the AlphaFold model maps by identity, with no unobserved', async () => {
  const [mapping] = await buildResidueMappings({
    msaText: msa({ 'SARS-CoV-2': gapped(SPIKE) }),
    rows: [
      { row: 'SARS-CoV-2', accession: 'P0DTC2', structure: 'alphafold' },
    ],
    date: DATE,
  })
  expect(mapping).toEqual({
    row: 'SARS-CoV-2',
    accession: 'P0DTC2',
    structure: {
      id: 'AF-0000000365840314',
      kind: 'predicted',
      asymId: 'A',
      url: 'https://alphafold.ebi.ac.uk/files/AF-0000000365840314-model_v1.cif',
    },
    segments: [{ rowStart: 1, rowEnd: 1273, structStart: 1, structEnd: 1273 }],
    rowLength: 1273,
    generated: { by: 'alphafold', date: DATE },
  })
  const [, init] = fetchMock.mock.calls.find(([url]) =>
    String(url).includes('alphafold'),
  )!
  expect(init.headers['User-Agent']).toMatch(/react-msaview-cli/)
})

test('an AlphaFold fragment row covers its own residues from the fragment start', async () => {
  const row = 'SPIKE_SARS2/319-541'
  const [mapping] = await buildResidueMappings({
    msaText: msa({ [row]: SPIKE.slice(318, 541) }),
    rows: [{ row, accession: 'P0DTC2', structure: 'alphafold' }],
    date: DATE,
  })
  expect(mapping!.segments).toEqual([
    { rowStart: 1, rowEnd: 223, structStart: 319, structEnd: 541 },
  ])
})

test('a row that differs from UniProt fails, naming the row, accession and position', async () => {
  const mutated = `${SPIKE.slice(0, 613)}G${SPIKE.slice(614)}`
  await expect(
    buildResidueMappings({
      msaText: msa({ D614G: mutated }),
      rows: [{ row: 'D614G', accession: 'P0DTC2', structure: 'alphafold' }],
    }),
  ).rejects.toThrow(
    'row D614G is not P0DTC2: they first differ at row residue 614, where the row has G and P0DTC2 residue 614 is D',
  )
})

test('an unnamed fragment fails with the range to name it by', async () => {
  await expect(
    buildResidueMappings({
      msaText: msa({ RBD: SPIKE.slice(318, 541) }),
      rows: [{ row: 'RBD', accession: 'P0DTC2', structure: 'alphafold' }],
    }),
  ).rejects.toThrow('name it RBD/319-541')
})

test('a fragment range that disagrees with its residues fails at the first one', async () => {
  const row = 'SPIKE_SARS2/320-542'
  await expect(
    buildResidueMappings({
      msaText: msa({ [row]: SPIKE.slice(318, 541) }),
      rows: [{ row, accession: 'P0DTC2', structure: 'alphafold' }],
    }),
  ).rejects.toThrow(/is not P0DTC2 320-542: they first differ at row residue 1,/)
})

test('a chain SIFTS does not map is reported with the chains it does', async () => {
  await expect(
    buildResidueMappings({
      msaText: msa({ 'SARS-CoV-2': SPIKE }),
      rows: [
        {
          row: 'SARS-CoV-2',
          accession: 'P0DTC2',
          structure: { pdb: '6VXX', chain: 'Z' },
        },
      ],
    }),
  ).rejects.toThrow('6VXX chain Z has no SIFTS mapping to P0DTC2; chains A, B, C do')
})

test('structure column forms', () => {
  expect(parseStructure('6vxx:A')).toEqual({ pdb: '6VXX', chain: 'A' })
  expect(parseStructure('AlphaFold')).toBe('alphafold')
  expect(() => parseStructure('6VXX')).toThrow(/PDB:CHAIN/)
})

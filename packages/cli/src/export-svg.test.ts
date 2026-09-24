import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterAll, beforeAll, expect, test } from 'vitest'

import { exportSvg } from './export-svg.ts'

let dir: string

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-svg-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

function write(name: string, text: string) {
  const file = path.join(dir, name)
  fs.writeFileSync(file, text)
  return file
}

const MSA = '>seq1\nMKAANSEQWERTY\n>seq2\nMKA-NSEQWERTY\n'

async function render(options: Partial<Parameters<typeof exportSvg>[0]>) {
  const outputFile = path.join(dir, 'out.svg')
  await exportSvg({
    outputFile,
    width: 800,
    height: 300,
    ...options,
  })
  return fs.readFileSync(outputFile, 'utf8')
}

test('an InterProScan JSON --gff draws its domains', async () => {
  const gffFile = write(
    'scan.json',
    JSON.stringify({
      results: [
        {
          xref: [{ id: 'seq1' }],
          matches: [
            {
              signature: {
                entry: {
                  accession: 'IPR999999',
                  name: 'Testdomain',
                  description: 'A test domain',
                },
              },
              locations: [{ start: 2, end: 8 }],
            },
          ],
        },
      ],
    }),
  )
  const svg = await render({ msaFile: write('a.fa', MSA), gffFile })
  expect(svg).toContain('Testdomain')
})

test('--spec draws the columnTracks example from docs/layers.md', async () => {
  const specFile = write(
    'columnTracks.json',
    JSON.stringify({
      type: 'MsaView',
      data: { msa: '>human\nMKAANSE\n>mouse\nMKA-NSE' },
      columnTracks: [
        {
          id: 'dnds',
          name: 'dN/dS',
          kind: 'bar',
          values: [0.1, 0.4, 1.8, 0.2, 0.3, 0.1],
          max: 2,
          color: '#6a51a3',
          row: 'human',
        },
        {
          id: 'frame',
          name: 'Codon frame',
          kind: 'text',
          data: '1231231',
          colors: { '1': '#ddd', '2': '#bbb', '3': '#999' },
        },
      ],
    }),
  )
  const svg = await render({ specFile })
  expect(svg).toContain('dN/dS')
  expect(svg).toContain('Codon frame')
  expect(svg).toContain('#6a51a3')
})

test('--spec reads a shorthand msa path beside the spec, and --msa overrides it', async () => {
  write('spec-rows.fa', MSA)
  const specFile = write(
    'shorthand.json',
    JSON.stringify({
      msa: 'spec-rows.fa',
      query: 'seq1',
      highlights: ['2-5 Motif'],
    }),
  )
  expect(await render({ specFile })).toContain('Motif')

  const other = write('other.fa', '>other1\nMKAANSE\n>other2\nMKAANSE\n')
  const svg = await render({ specFile, msaFile: other })
  expect(svg).toContain('other1')
  expect(svg).not.toContain('seq1')
})

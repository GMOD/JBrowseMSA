import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterAll, beforeAll, expect, test } from 'vitest'

import { MAX_EXPORT_LETTERS, exportSvg } from './export-svg.ts'

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
          encoding: { y: { scale: { domainMax: 2 } } },
          color: '#6a51a3',
          row: 'human',
        },
        {
          id: 'frame',
          name: 'Codon frame',
          kind: 'text',
          data: '1231231',
          encoding: {
            color: {
              scale: {
                domain: ['1', '2', '3'],
                range: ['#ddd', '#bbb', '#999'],
              },
            },
          },
        },
      ],
    }),
  )
  const svg = await render({ specFile })
  expect(svg).toContain('dN/dS')
  expect(svg).toContain('Codon frame')
  expect(svg).toContain('#6a51a3')
})

test('--props draws what MSAViewer draws from the same props', async () => {
  const propsFile = write(
    'props.json',
    JSON.stringify({
      msa: MSA,
      gff: '##gff-version 3\nseq1\tsrc\tdomain\t2\t8\t.\t.\t.\tName=Propdomain',
      theme: 'dark',
      highlights: [{ start: 3, end: 4, label: 'Site' }],
    }),
  )
  const svg = await render({ propsFile })
  expect(svg).toContain('Propdomain')
  expect(svg).toContain('Site')
  const light = await render({ propsFile, theme: 'light' })
  const background = (s: string) => /<rect[^>]*fill="([^"]+)"/.exec(s)![1]
  expect(background(svg)).not.toBe(background(light))
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

test('@napi-rs/canvas measures the labels the tree area fits', async () => {
  const width = (name: string) =>
    render({
      msaFile: write(`${name}.fa`, `>${name}\nMKAANSE\n>b\nMKA-NSE\n`),
    }).then(svg => Number(/<svg[^>]* width="([\d.]+)"/.exec(svg)![1]))
  expect(await width('WWWWWWWWWWWW')).toBeGreaterThan(
    await width('iiiiiiiiiiii'),
  )
})

test('-o picks the format from its extension', async () => {
  const msaFile = write('fmt.fa', MSA)
  const png = path.join(dir, 'out.png')
  const pdf = path.join(dir, 'out.pdf')
  await exportSvg({ msaFile, outputFile: png, scale: 1 })
  await exportSvg({ msaFile, outputFile: pdf })
  expect(fs.readFileSync(png).subarray(1, 4).toString()).toBe('PNG')
  expect(fs.readFileSync(pdf).subarray(0, 5).toString()).toBe('%PDF-')
  const small = fs.statSync(png).size
  await exportSvg({ msaFile, outputFile: png, scale: 3 })
  expect(fs.statSync(png).size).toBeGreaterThan(small)
  await expect(
    exportSvg({ msaFile, outputFile: path.join(dir, 'out.jpg') }),
  ).rejects.toThrow('.svg, .png or .pdf')
})

test('an entire export past the letter limit is refused, naming the flags that help', async () => {
  const columns = Math.ceil(MAX_EXPORT_LETTERS / 2) + 1
  const msaFile = write(
    'wide.fa',
    `>a\n${'A'.repeat(columns)}\n>b\n${'C'.repeat(columns)}\n`,
  )
  const error = await render({ msaFile }).catch((e: unknown) => e)
  expect(String(error)).toMatch(
    /--col-width.*--row-height.*--viewport.*--force/,
  )
  expect(await render({ msaFile, viewport: true })).toContain('<svg')
})

test('a PNG without rsvg-convert names librsvg before rendering', async () => {
  const pathEnv = process.env.PATH
  process.env.PATH = dir
  try {
    await expect(
      exportSvg({
        msaFile: write('norsvg.fa', MSA),
        outputFile: path.join(dir, 'norsvg.png'),
      }),
    ).rejects.toThrow('install librsvg')
  } finally {
    process.env.PATH = pathEnv
  }
})

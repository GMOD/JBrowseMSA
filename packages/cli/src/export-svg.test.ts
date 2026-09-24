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
    colorScheme: 'maeditor',
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

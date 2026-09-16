import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let dir: string
let out: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'interpro-precomputed-'))
  process.env.REACT_MSAVIEW_CACHE = path.join(dir, 'cache')
  out = path.join(dir, 'domains.gff')
  vi.resetModules()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  delete process.env.REACT_MSAVIEW_CACHE
  fs.rmSync(dir, { recursive: true, force: true })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const RELEASE = { databases: { interpro: { version: '110.0' } } }
const MATCH = {
  results: [
    {
      metadata: {
        accession: 'PF00001',
        name: 'Kinase',
        integrated: 'IPR000001',
      },
      proteins: [
        { entry_protein_locations: [{ fragments: [{ start: 5, end: 40 }] }] },
      ],
    },
  ],
  next: null,
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

async function run(inputLines: string) {
  const input = path.join(dir, 'accessions.tsv')
  fs.writeFileSync(input, inputLines)
  const { runInterProPrecomputed } = await import('./interpro-precomputed.ts')
  await runInterProPrecomputed({
    inputFile: input,
    outputFile: out,
    database: 'pfam',
  })
  return fs.readFileSync(out, 'utf8')
}

function cacheFiles() {
  const dbDir = path.join(dir, 'cache', '110.0', 'pfam')
  return fs.existsSync(dbDir) ? fs.readdirSync(dbDir) : []
}

test('a 404 is retried, since the API gives one to accessions that have matches', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(RELEASE))
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(json(MATCH))
  vi.stubGlobal('fetch', fetchMock)

  const gff = await run('P00001\tHuman\n')
  expect(gff).toContain('IPR000001')
  expect(cacheFiles()).toEqual(['P00001.json'])
})

test('an accession the API never resolves stays out of the cache', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(RELEASE))
    .mockResolvedValue(new Response('', { status: 404 }))
  vi.stubGlobal('fetch', fetchMock)

  const gff = await run('P00002\tHuman\n')
  expect(gff).not.toContain('IPR')
  expect(cacheFiles()).toEqual([])
})

test('a 204 means no matches, which is an answer worth caching', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(RELEASE))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)

  await run('P00003\tHuman\n')
  expect(cacheFiles()).toEqual(['P00003.json'])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

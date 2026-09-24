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

async function run(inputLines: string, msa?: string) {
  const input = path.join(dir, 'accessions.tsv')
  fs.writeFileSync(input, inputLines)
  let msaFile: string | undefined
  if (msa !== undefined) {
    msaFile = path.join(dir, 'rows.fa')
    fs.writeFileSync(msaFile, msa)
  }
  const { runInterProPrecomputed } = await import('./interpro-precomputed.ts')
  await runInterProPrecomputed({
    inputFile: input,
    outputFile: out,
    database: 'pfam',
    msaFile,
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

test('a failed release lookup reads the newest cached release', async () => {
  for (const release of ['9.0', '110.0']) {
    const file = path.join(dir, 'cache', release, 'pfam', 'P00001.json')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(MATCH.results))
  }
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
  vi.stubGlobal('fetch', fetchMock)

  const gff = await run('P00001\tHuman\n')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(gff).toContain('InterPro 110.0')
  expect(gff).toContain('IPR000001')
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('release 110.0'),
  )
})

test('with nothing cached, a failed release lookup fails the run', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('', { status: 404 })),
  )
  await expect(run('P00001\tHuman\n')).rejects.toThrow(
    'InterPro release lookup failed: 404',
  )
})

test('an id that is not a UniProtKB accession fails before any request, naming interproscan', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  await expect(run('NP_000537.3\tHuman\nP53_HUMAN\tMouse\n')).rejects.toThrow(
    /NP_000537\.3, P53_HUMAN.*interproscan/,
  )
  expect(fetchMock).not.toHaveBeenCalled()
  expect(cacheFiles()).toEqual([])
})

test('an isoform or version suffix reads the canonical accession', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(RELEASE))
    .mockResolvedValueOnce(json(MATCH))
  vi.stubGlobal('fetch', fetchMock)

  const gff = await run('p00001-2\tHuman\nP00001.4\tMouse\n')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(String(fetchMock.mock.calls[1]![0])).toContain('/P00001/')
  expect(cacheFiles()).toEqual(['P00001.json'])
  expect(gff).toContain('Human\t')
  expect(gff).toContain('Mouse\t')
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('canonical sequence'),
  )
})

test('a /start-end fragment row gets its matches in its own positions, clipped', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(RELEASE))
    .mockResolvedValueOnce(json(MATCH))
  vi.stubGlobal('fetch', fetchMock)

  const fragment = 'A'.repeat(28)
  const gff = await run(
    'P00001\tP00001/3-30\n',
    `>P00001/3-30\n${fragment.slice(0, 10)}--${fragment.slice(10)}\n`,
  )
  expect(gff).toContain('P00001/3-30\tInterProScan\tprotein_match\t3\t28\t')
  expect(console.warn).not.toHaveBeenCalledWith(
    expect.stringContaining('residues'),
  )
})

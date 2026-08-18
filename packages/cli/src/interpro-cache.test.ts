import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'interpro-cache-'))
  process.env.REACT_MSAVIEW_CACHE = dir
  vi.resetModules()
})

afterEach(() => {
  delete process.env.REACT_MSAVIEW_CACHE
  fs.rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

async function load() {
  return import('./interpro-cache.ts')
}

test('a written entry reads back, and an unwritten one misses', async () => {
  const { readCached, writeCached } = await load()
  expect(readCached('109.0', 'pfam', 'P12931')).toBeUndefined()
  writeCached('109.0', 'pfam', 'P12931', [{ accession: 'PF07714' }])
  expect(readCached('109.0', 'pfam', 'P12931')).toEqual([
    { accession: 'PF07714' },
  ])
})

test('an empty result caches, so matchless proteins are not re-fetched', async () => {
  const { readCached, writeCached } = await load()
  writeCached('109.0', 'pfam', 'P00000', [])
  expect(readCached('109.0', 'pfam', 'P00000')).toEqual([])
})

test('a new release misses rather than serving the old coordinates', async () => {
  const { readCached, writeCached } = await load()
  writeCached('109.0', 'pfam', 'P12931', [{ accession: 'PF07714' }])
  expect(readCached('110.0', 'pfam', 'P12931')).toBeUndefined()
  expect(readCached('109.0', 'cdd', 'P12931')).toBeUndefined()
})

test('a path-traversing accession is refused, not escaped', async () => {
  const { writeCached, readCached } = await load()
  // writeCached swallows the throw (an unwritable cache must not fail a run),
  // so assert nothing landed outside the cache root
  writeCached('109.0', 'pfam', '../../escaped', 'x')
  expect(readCached('109.0', 'pfam', '../../escaped')).toBeUndefined()
  expect(fs.existsSync(path.join(dir, '..', '..', 'escaped.json'))).toBe(false)
})

test('corrupt cache content is a miss, not a crash', async () => {
  const { readCached } = await load()
  const file = path.join(dir, '109.0', 'pfam', 'P12931.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '{not json')
  expect(readCached('109.0', 'pfam', 'P12931')).toBeUndefined()
})

test('a retryable status is retried and the eventual success returned', async () => {
  const { fetchWithRetry } = await load()
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(new Response('ok', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  const res = await fetchWithRetry('https://example.org/x', { baseDelayMs: 0 })
  expect(res.status).toBe(200)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('a 404 returns immediately rather than burning retries on it', async () => {
  const { fetchWithRetry } = await load()
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
  vi.stubGlobal('fetch', fetchMock)

  expect((await fetchWithRetry('https://example.org/x')).status).toBe(404)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('a 204 returns immediately: no matches is an answer, not a failure', async () => {
  const { fetchWithRetry } = await load()
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)

  expect((await fetchWithRetry('https://example.org/x')).status).toBe(204)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('giving up names the url and the attempt count', async () => {
  const { fetchWithRetry } = await load()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('', { status: 503 })),
  )
  await expect(
    fetchWithRetry('https://example.org/x', { attempts: 2, baseDelayMs: 0 }),
  ).rejects.toThrow(/https:\/\/example\.org\/x failed after 2 attempts/)
})

test('a network-level throw is retried like a retryable status', async () => {
  const { fetchWithRetry } = await load()
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('ECONNRESET'))
    .mockResolvedValueOnce(new Response('ok', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  expect(
    (await fetchWithRetry('https://example.org/x', { baseDelayMs: 0 })).status,
  ).toBe(200)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

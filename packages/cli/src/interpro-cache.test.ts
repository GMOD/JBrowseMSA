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

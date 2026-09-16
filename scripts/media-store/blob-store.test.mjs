import { describe, expect, test } from 'vitest'

import {
  cmpStr,
  diffManifests,
  formatManifest,
  imageSize,
  mergeManifest,
  parseManifest,
  storeKey,
} from './blob-store.mjs'

describe('storeKey', () => {
  test('embeds the name, a 12-char hash prefix and the extension', () => {
    const entry = {
      path: 'docs/media/mitogenome_genes-4.png',
      sha256:
        '8e3bf6224f3c9d8b7a6f5e4d3c2b1a09f8e7d6c5b4a392817263544536271809',
    }
    expect(storeKey(entry)).toBe(
      'msaview-figures/mitogenome_genes-4.8e3bf6224f3c.png',
    )
  })

  test('keeps the svg extension', () => {
    const entry = {
      path: 'docs/media/tree-collapse.svg',
      sha256: 'a'.repeat(64),
    }
    expect(storeKey(entry)).toBe(
      'msaview-figures/tree-collapse.aaaaaaaaaaaa.svg',
    )
  })
})

describe('formatManifest / parseManifest', () => {
  test('round-trips every field, including a dimensionless entry', () => {
    const entries = [
      {
        path: 'docs/media/b.png',
        width: 100,
        height: 50,
        bytes: 1234,
        sha256: 'b'.repeat(64),
      },
      { path: 'docs/media/a.svg', bytes: 500, sha256: 'a'.repeat(64) },
    ]
    const text = formatManifest(entries, '# header\n')
    expect(text).toContain(`docs/media/a.svg - 500 ${'a'.repeat(64)}`)
    expect(text).toContain(`docs/media/b.png 100x50 1234 ${'b'.repeat(64)}`)

    const parsed = parseManifest(text, 'media.lock')
    expect(parsed.size).toBe(2)
    expect(parsed.get('docs/media/a.svg')).toEqual({
      path: 'docs/media/a.svg',
      width: undefined,
      height: undefined,
      bytes: 500,
      sha256: 'a'.repeat(64),
    })
    expect(parsed.get('docs/media/b.png')).toEqual({
      path: 'docs/media/b.png',
      width: 100,
      height: 50,
      bytes: 1234,
      sha256: 'b'.repeat(64),
    })
  })

  test('sorts the written lines by path', () => {
    const text = formatManifest(
      [
        { path: 'docs/media/z.png', bytes: 1, sha256: 'z'.repeat(64) },
        { path: 'docs/media/a.png', bytes: 1, sha256: 'a'.repeat(64) },
      ],
      '# header\n',
    )
    const lines = text.trim().split('\n').slice(1)
    expect(lines[0].startsWith('docs/media/a.png')).toBe(true)
    expect(lines[1].startsWith('docs/media/z.png')).toBe(true)
  })

  test('skips blank lines and # comments', () => {
    const text = '# a comment\n\ndocs/media/a.png - 1 ' + 'a'.repeat(64) + '\n'
    const parsed = parseManifest(text, 'media.lock')
    expect(parsed.size).toBe(1)
    expect(parsed.has('docs/media/a.png')).toBe(true)
  })

  test('throws on a line missing a field', () => {
    expect(() =>
      parseManifest('docs/media/a.png 1x1 500\n', 'media.lock'),
    ).toThrow('malformed media.lock line: docs/media/a.png 1x1 500')
  })
})

describe('cmpStr', () => {
  test('orders by code point, not locale', () => {
    expect(cmpStr('a', 'B')).toBe(1)
    // localeCompare treats lowercase as sorting with (or before) its
    // uppercase counterpart in the default locale, the opposite call.
    expect('a'.localeCompare('B')).toBeLessThan(0)
  })

  test('returns -1, 0 or 1', () => {
    expect(cmpStr('a', 'b')).toBe(-1)
    expect(cmpStr('a', 'a')).toBe(0)
    expect(cmpStr('b', 'a')).toBe(1)
  })
})

describe('imageSize', () => {
  test('reads width and height out of a minimal PNG IHDR chunk', () => {
    const buf = Buffer.alloc(24)
    buf.write('IHDR', 12, 'latin1')
    buf.writeUInt32BE(200, 16)
    buf.writeUInt32BE(100, 20)
    expect(imageSize(buf)).toEqual({ width: 200, height: 100 })
  })

  test('returns {} for anything that is not a PNG', () => {
    expect(imageSize(Buffer.from('<svg></svg>'))).toEqual({})
    expect(imageSize(Buffer.alloc(10))).toEqual({})
  })
})

describe('diffManifests', () => {
  test('classifies added, changed and removed, sorted by path', () => {
    const before = new Map([
      [
        'docs/media/keep.png',
        { path: 'docs/media/keep.png', bytes: 1, sha256: 'k'.repeat(64) },
      ],
      [
        'docs/media/gone.png',
        { path: 'docs/media/gone.png', bytes: 1, sha256: 'g'.repeat(64) },
      ],
      [
        'docs/media/change.png',
        { path: 'docs/media/change.png', bytes: 1, sha256: 'c'.repeat(64) },
      ],
    ])
    const after = new Map([
      ['docs/media/keep.png', before.get('docs/media/keep.png')],
      [
        'docs/media/change.png',
        { path: 'docs/media/change.png', bytes: 2, sha256: 'd'.repeat(64) },
      ],
      [
        'docs/media/new.png',
        { path: 'docs/media/new.png', bytes: 3, sha256: 'n'.repeat(64) },
      ],
    ])
    expect(diffManifests(before, after).map(d => [d.path, d.kind])).toEqual([
      ['docs/media/change.png', 'changed'],
      ['docs/media/gone.png', 'removed'],
      ['docs/media/new.png', 'added'],
    ])
  })
})

describe('mergeManifest', () => {
  test('fresh entries win; existing entries absent from fresh are kept', () => {
    const existing = new Map([
      [
        'docs/media/a.png',
        { path: 'docs/media/a.png', bytes: 1, sha256: 'o'.repeat(64) },
      ],
      [
        'docs/media/stale.png',
        { path: 'docs/media/stale.png', bytes: 9, sha256: 's'.repeat(64) },
      ],
    ])
    const fresh = new Map([
      [
        'docs/media/a.png',
        { path: 'docs/media/a.png', bytes: 2, sha256: 'n'.repeat(64) },
      ],
    ])
    const merged = mergeManifest(existing, fresh)
    expect(merged.size).toBe(2)
    expect(merged.get('docs/media/a.png')).toEqual(
      fresh.get('docs/media/a.png'),
    )
    expect(merged.get('docs/media/stale.png')).toEqual(
      existing.get('docs/media/stale.png'),
    )
  })
})

/**
 * Pure helpers for the docs/media content-addressed blob store: the manifest
 * grammar, the S3 key a figure's bytes live at, and the comparisons both need.
 * No fs, no network — media.mjs does the I/O and calls into this file.
 */
import { createHash } from 'node:crypto'

// One corpus, one bucket.
export const storeBucket = 's3://jbrowse.org'
export const storePrefix = 'msaview-figures'
export const publicBase = 'https://jbrowse.org'
export const extRe = /\.(png|svg)$/i

// aws s3 cp otherwise guesses content-type from the local platform's mime
// database, which differs by machine: a figure pushed from one laptop and
// re-pushed from another could serve a different header for the same bytes.
// Naming it here makes the served type a property of the extension, not of
// whoever ran the command.
export const contentTypes = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

// A storeKey embeds the sha256, so a given key's bytes never change once
// written; caching it for a year as immutable is a fact about the key, not an
// optimistic guess. That matters more than the usual perf argument here: the
// bucket's versioning is Suspended, so a PUT to an existing key clobbers it in
// place with no recovery. Only ever writing keys named after their own bytes
// (see storeKey below) is what makes push safe to run twice.
export const CACHE_CONTROL = 'public, max-age=31536000, immutable'

// 'docs/media/foo.png' -> 'foo'
export const name = mediaPath =>
  mediaPath.replace(/^docs\/media\//, '').replace(extRe, '')

// Code-point order, never localeCompare: the manifest is checked in, so two
// machines must agree on its sort or the file churns on its own with no
// content change behind it.
export const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export const hashBuffer = buf => createHash('sha256').update(buf).digest('hex')

// The name is in the key so a store URL says which file it is, and so a
// truncated hash only has to be unique among revisions of ONE figure rather
// than every blob in the bucket. Truncating is safe because the key is not
// the integrity check: the manifest carries the full sha256, and pull
// verifies against that, not against the key.
export function storeKey(entry) {
  const ext = entry.path.match(extRe)?.[0] ?? ''
  return `${storePrefix}/${name(entry.path)}.${entry.sha256.slice(0, 12)}${ext}`
}

export const storeUrl = entry => `${publicBase}/${storeKey(entry)}`

const dims = e =>
  e.width != null && e.height != null ? `${e.width}x${e.height}` : '-'

// One line per file, path first since that's the sort key, single-spaced:
// column alignment would rewrite a neighbouring line the moment a byte count
// gained a digit.
export function formatManifest(entries, header) {
  const lines = [...entries]
    .sort((a, b) => cmpStr(a.path, b.path))
    .map(e => `${e.path} ${dims(e)} ${e.bytes} ${e.sha256}`)
  return header + lines.join('\n') + '\n'
}

export function parseManifest(text, lockName) {
  const entries = new Map()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) {
      continue
    }
    const fields = line.split(' ')
    if (fields.length !== 4) {
      throw new Error(`malformed ${lockName} line: ${raw}`)
    }
    const [path, wh, bytes, sha256] = fields
    const [width, height] =
      wh === '-' ? [undefined, undefined] : wh.split('x').map(Number)
    entries.set(path, { path, width, height, bytes: Number(bytes), sha256 })
  }
  return entries
}

// PNG only: an 8-byte signature then the IHDR chunk, width and height as its
// first two big-endian uint32s. SVG, and anything else, has no fixed header to
// read a size from, so it gets {}. Dimensions live in the manifest because a
// resize is the one change a pixel diff is blind to: two different-sized
// images have no comparable diff, and `1400x900 -> 1400x1240` in a git diff
// says so where a hash swap does not.
export function imageSize(buf) {
  if (buf.length >= 24 && buf.subarray(12, 16).toString('latin1') === 'IHDR') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  return {}
}

export function diffManifests(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()])
  const diffs = []
  for (const path of paths) {
    const b = before.get(path)
    const a = after.get(path)
    if (!b) {
      diffs.push({ path, kind: 'added', before: undefined, after: a })
    } else if (!a) {
      diffs.push({ path, kind: 'removed', before: b, after: undefined })
    } else if (b.sha256 !== a.sha256) {
      diffs.push({ path, kind: 'changed', before: b, after: a })
    }
  }
  return diffs.sort((x, y) => cmpStr(x.path, y.path))
}

export function mergeManifest(existing, fresh) {
  const merged = new Map(existing)
  for (const [path, entry] of fresh) {
    merged.set(path, entry)
  }
  return merged
}

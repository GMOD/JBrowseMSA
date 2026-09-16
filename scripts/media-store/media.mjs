#!/usr/bin/env node
/**
 * CLI for the docs/media content-addressed blob store. blob-store.mjs holds
 * the manifest grammar and key scheme; this file does the I/O: read
 * docs/media and media.lock, talk to the bucket, print reports.
 *
 *   node scripts/media-store/media.mjs <status|pull|push|check|report>
 *
 * Backs the root package.json's `media:*` scripts. `pnpm figures` already
 * means the SVG figure vitest suite (`vitest.figures.config.ts`), and
 * `pnpm check:media` already checks that every docs/media file is shown by
 * some page — a different question from whether media.lock matches the
 * worktree, which is what `media:check` here checks. Named `media:*` to stay
 * out of both.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { flag, listOpt, opt } from '../screenshots/lib.mjs'
import {
  CACHE_CONTROL,
  cmpStr,
  contentTypes,
  diffManifests,
  extRe,
  formatManifest,
  hashBuffer,
  imageSize,
  mergeManifest,
  name,
  parseManifest,
  storeBucket,
  storeKey,
  storeUrl,
} from './blob-store.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)
const mediaDir = path.join(repoRoot, 'docs', 'media')
const lockPath = path.join(repoRoot, 'media.lock')

const LOCK_HEADER = `# The bytes for docs/media figures live in S3; this file is what git tracks.
# scripts/media-store/media.mjs maintains it: one line per file, sorted by path.
# <path> <WxH, or - when unknown> <bytes> <sha256>
`

function scanLocal() {
  const entries = new Map()
  for (const file of fs.readdirSync(mediaDir).filter(f => extRe.test(f))) {
    const relPath = `docs/media/${file}`
    const buf = fs.readFileSync(path.join(mediaDir, file))
    entries.set(relPath, {
      path: relPath,
      ...imageSize(buf),
      bytes: buf.length,
      sha256: hashBuffer(buf),
    })
  }
  return entries
}

function readLock() {
  if (!fs.existsSync(lockPath)) {
    return new Map()
  }
  return parseManifest(fs.readFileSync(lockPath, 'utf8'), 'media.lock')
}

function writeLock(entries) {
  fs.writeFileSync(lockPath, formatManifest([...entries.values()], LOCK_HEADER))
}

function printDiffs(diffs) {
  const counts = { added: 0, changed: 0, removed: 0 }
  for (const d of diffs) {
    counts[d.kind]++
  }
  console.log(
    `${counts.added} added, ${counts.changed} changed, ${counts.removed} removed`,
  )
  for (const d of diffs) {
    console.log(`  ${d.kind} ${d.path}`)
  }
}

function cmdStatus() {
  printDiffs(diffManifests(readLock(), scanLocal()))
}

function cmdCheck() {
  const diffs = diffManifests(readLock(), scanLocal())
  if (diffs.length === 0) {
    console.log('media.lock matches docs/media')
    return
  }
  printDiffs(diffs)
  console.error('media.lock is out of date: run pnpm media:push to update it')
  process.exit(1)
}

async function pullOne(entry) {
  const res = await fetch(storeUrl(entry))
  if (!res.ok) {
    throw new Error(`GET ${storeUrl(entry)} -> ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const sha256 = hashBuffer(buf)
  if (sha256 !== entry.sha256) {
    throw new Error(
      `hash mismatch for ${entry.path}: manifest has ${entry.sha256}, downloaded ${sha256}`,
    )
  }
  fs.writeFileSync(path.join(repoRoot, entry.path), buf)
}

// Plain queue + worker pool at concurrency 8, the same shape
// scripts/screenshots/generate.mjs uses for its browser pool: no dependency
// worth adding for the one loop this file needs.
async function cmdPull() {
  const force = flag('force')
  const lock = readLock()
  const local = scanLocal()
  const queue = [...lock.values()].filter(
    e => force || local.get(e.path)?.sha256 !== e.sha256,
  )
  if (queue.length === 0) {
    console.log('docs/media already matches media.lock')
    return
  }
  console.log(`pulling ${queue.length} file(s), concurrency 8`)
  const failures = []
  const worker = async () => {
    while (queue.length > 0) {
      const entry = queue.shift()
      try {
        await pullOne(entry)
        console.log(`  ✓ ${entry.path}`)
      } catch (e) {
        failures.push(entry.path)
        console.error(`  ✗ ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()))
  if (failures.length > 0) {
    console.error(`${failures.length} file(s) failed to pull`)
    process.exit(1)
  }
}

async function cmdPush() {
  const filters = listOpt('filter')
  const local = scanLocal()
  const lock = readLock()
  const knownKeys = new Set([...lock.values()].map(storeKey))
  const candidates =
    filters.length > 0
      ? [...local.values()].filter(e =>
          filters.some(f => name(e.path).includes(f)),
        )
      : [...local.values()]
  const toPush = candidates
    .filter(e => !knownKeys.has(storeKey(e)))
    .sort((a, b) => cmpStr(a.path, b.path))

  if (toPush.length === 0) {
    console.log('nothing to push: every candidate already has a matching key')
  } else {
    console.log(`push would run ${toPush.length} upload(s):`)
    for (const entry of toPush) {
      const ext = entry.path.match(extRe)?.[0] ?? ''
      const contentType = contentTypes[ext] ?? 'application/octet-stream'
      console.log(
        `  aws s3 cp ${entry.path} ${storeBucket}/${storeKey(entry)} --content-type ${contentType} --cache-control "${CACHE_CONTROL}"`,
      )
      // TODO: execute once the bucket policy is confirmed.
    }
  }

  // The uploads above happen before this rewrite: a media.lock line naming a
  // blob nobody pushed yet breaks pull for everyone else who reads it first.
  writeLock(mergeManifest(lock, local))
  console.log(
    `media.lock rewritten (${local.size} entr${local.size === 1 ? 'y' : 'ies'})`,
  )
}

function readLockAtRef(ref) {
  let text
  try {
    text = execFileSync('git', ['show', `${ref}:media.lock`], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
  } catch (e) {
    throw new Error(`git show ${ref}:media.lock failed: ${e.message}`)
  }
  return parseManifest(text, `${ref}:media.lock`)
}

const dimsCell = e =>
  e?.width != null && e?.height != null ? `${e.width}x${e.height}` : '-'

// Both before and after resolve to immutable public URLs (the hash is in the
// key), which is what lets a reviewer see both images side by side for a
// changed figure without checking anything out locally.
function imgCell(d) {
  if (d.kind === 'added') {
    return `<img src="${storeUrl(d.after)}" width="200">`
  }
  if (d.kind === 'changed') {
    return `<img src="${storeUrl(d.before)}" width="200"> <img src="${storeUrl(d.after)}" width="200">`
  }
  return ''
}

function cmdReport() {
  const base = opt('base', 'HEAD')
  const diffs = diffManifests(readLockAtRef(base), readLock())
  if (diffs.length === 0) {
    console.log(`no media.lock changes since ${base}`)
    return
  }
  console.log(
    '| path | kind | before dims | after dims | before bytes | after bytes | image |',
  )
  console.log('| --- | --- | --- | --- | --- | --- | --- |')
  for (const d of diffs) {
    console.log(
      `| ${d.path} | ${d.kind} | ${dimsCell(d.before)} | ${dimsCell(d.after)} | ${d.before?.bytes ?? '-'} | ${d.after?.bytes ?? '-'} | ${imgCell(d)} |`,
    )
  }
}

const USAGE = `Usage: node scripts/media-store/media.mjs <command>

  status                  diff docs/media against media.lock
  pull [--force]           fetch every file the manifest names that's missing
                           or stale locally; --force refetches even a match
  push [--dry-run] [--filter a,b]
                           print the s3 cp commands a push would run, then
                           rewrite media.lock; always a dry run for now (see
                           the TODO inside cmdPush) regardless of --dry-run
  check                    exit non-zero when docs/media and media.lock disagree
  report [--base <ref>]    markdown table of what the manifest changed since
                           <ref> (default HEAD), with links to both images

No command needs credentials except push, and push does not call aws yet.
`

async function main() {
  const [command] = process.argv.slice(2)
  if (!command || flag('help')) {
    console.log(USAGE)
    return
  }
  switch (command) {
    case 'status':
      cmdStatus()
      break
    case 'pull':
      await cmdPull()
      break
    case 'push':
      await cmdPush()
      break
    case 'check':
      cmdCheck()
      break
    case 'report':
      cmdReport()
      break
    default:
      console.error(`unknown command: ${command}\n`)
      console.log(USAGE)
      process.exit(1)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

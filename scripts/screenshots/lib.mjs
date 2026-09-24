/**
 * Shared CLI + browser/server helpers for the puppeteer screenshot phases
 * (generate.mjs, jbrowse-figures.mjs, the f12-*.mjs figures) and the
 * orchestrator.
 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import serveHandler from 'serve-handler'

const args = process.argv.slice(2)

// Repo layout, resolved once from this file's location (scripts/screenshots/).
// Every consumer is a node script run from the checkout, so import.meta.url is
// the real path. It used to need a walk-up fallback because the website bundled
// specs.mjs into the gallery page for its live links, and a bundler rewrites
// import.meta.url to wherever it put the chunk.
export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)
export const mediaDir = path.join(repoRoot, 'docs', 'media')
export const appDataDir = path.join(
  repoRoot,
  'packages',
  'app',
  'public',
  'data',
)
// Where that data comes from: the examples package's files, which
// writeExampleData.mjs copies into the app and the live examples import directly.
export const examplesDataDir = path.join(
  repoRoot,
  'packages',
  'examples',
  'data',
)

// Temp path for a freshly captured PNG, namespaced by pid (concurrent specs) and
// an optional suffix (a --check run captures the same spec twice).
export const tmpShot = (name, suffix = '') =>
  path.join(os.tmpdir(), `msa-shot-${process.pid}-${name}${suffix}.png`)

// Puppeteer launch args shared by every capture: no sandbox (runs as root/CI),
// hidden scrollbars (clean frames). Phases that need more (e.g. jbrowse-web's
// cross-origin config + swiftshader webgl) spread this and append.
export const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--hide-scrollbars',
]

export const flag = name => args.includes(`--${name}`)

export const opt = (name, fallback) =>
  args.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback

export function numOpt(name, fallback) {
  const n = Number(opt(name, undefined))
  return Number.isFinite(n) ? n : fallback
}

// A comma-separated `--name=a,b,c` flag parsed into a trimmed, non-empty list.
export const listOpt = name =>
  (opt(name, '') || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

export const delay = ms => new Promise(r => setTimeout(r, ms))

// A cross-origin config (local config/plugin served on a different port from the
// jbrowse-web build) trips JBrowse's "this session contains unknown plugins"
// trust gate. Poll for the Trust button for ~10s and click it so the session
// actually loads; a session with no gate just falls through the loop.
export async function clickTrust(page) {
  let clicked = false
  for (let i = 0; i < 20 && !clicked; i++) {
    clicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find(b =>
        /trust/i.test(b.textContent || ''),
      )
      button?.click()
      return !!button
    })
    if (!clicked) {
      await delay(500)
    }
  }
}

const chromePaths = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

export function findChrome() {
  const found = chromePaths.find(p => fs.existsSync(p))
  if (!found) {
    throw new Error(`No Chrome/Chromium found in: ${chromePaths.join(', ')}`)
  }
  return found
}

// Serve a directory with permissive CORS (jbrowse-web fetches config/data
// cross-origin) and a large header cap (a jbrowse-web `?session=spec-` query
// string, or an old `?data=` link, can exceed node's default 16 KB limit).
export function startStaticServer(port, dir) {
  const server = http.createServer(
    { maxHeaderSize: 1024 * 1024 },
    (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      serveHandler(req, res, { public: dir })
    },
  )
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, () => {
      resolve(server)
    })
  })
}

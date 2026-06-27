/**
 * Shared CLI + browser/server helpers for the puppeteer screenshot phases
 * (generate.mjs, jbrowse-figures.mjs) and the orchestrator.
 */
import fs from 'node:fs'
import http from 'node:http'

import serveHandler from 'serve-handler'

const args = process.argv.slice(2)

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
// cross-origin) and a large header cap (the app deep-links a whole alignment via
// a `?data=` query string, which can exceed node's default 16 KB header limit).
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

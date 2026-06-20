/**
 * Automated screenshots of the demo app for docs/user_guide.md, driven by a
 * real browser (puppeteer-core + the system Chrome — no bundled download).
 *
 * Usage:  pnpm screenshots [--filter=name] [--headed]
 *
 * It serves packages/app/dist statically, navigates the app per spec
 * (scripts/screenshots/specs.mjs), runs any click/wait actions, and writes
 * docs/media/<name>.png. Build the app first (the pnpm script does this).
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer-core'
import serveHandler from 'serve-handler'

import { specs } from './specs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const appDist = path.join(repoRoot, 'packages', 'app', 'dist')
const outDir = path.join(repoRoot, 'docs', 'media')
const PORT = 5599

const args = process.argv.slice(2)
const headed = args.includes('--headed')
const filter = args.find(a => a.startsWith('--filter='))?.split('=')[1]

const delay = ms => new Promise(r => setTimeout(r, ms))

const chromePaths = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

function startServer() {
  // Some specs deep-link a full alignment via a `?data=` query string, which
  // for the real-data examples can run to tens of KB. Node's default request
  // line/header cap (16 KB) rejects those with HTTP 431, so raise it here.
  const server = http.createServer(
    { maxHeaderSize: 1024 * 1024 },
    (req, res) => serveHandler(req, res, { public: appDist }),
  )
  return new Promise(resolve =>
    server.listen(PORT, () => {
      resolve(server)
    }),
  )
}

async function runAction(page, action) {
  if (action.click) {
    const el = await page.waitForSelector(action.click, {
      visible: true,
      timeout: 20000,
    })
    await el.click()
    await delay(400)
  } else if (action.waitFor) {
    await page.waitForSelector(action.waitFor, {
      visible: true,
      timeout: 20000,
    })
  } else if (action.delay) {
    await delay(action.delay)
  }
}

async function capture(page, spec) {
  const file = path.join(outDir, `${spec.name}.png`)
  if (spec.clip === 'viewer') {
    const el = await page.waitForSelector('[data-testid="msaview"]', {
      visible: true,
      timeout: 20000,
    })
    await el.screenshot({ path: file })
  } else {
    await page.screenshot({ path: file })
  }
  console.log(`  ✓ ${spec.name}.png`)
}

async function main() {
  if (!fs.existsSync(appDist)) {
    console.error(
      `Build not found at ${appDist}. Run: pnpm --filter app exec vite build`,
    )
    process.exit(1)
  }
  const executablePath = chromePaths.find(p => fs.existsSync(p))
  if (!executablePath) {
    console.error(`No Chrome/Chromium found in: ${chromePaths.join(', ')}`)
    process.exit(1)
  }

  const list = filter ? specs.filter(s => s.name.includes(filter)) : specs
  const server = await startServer()
  const browser = await puppeteer.launch({
    headless: !headed,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
    defaultViewport: { width: 1200, height: 720, deviceScaleFactor: 2 },
  })

  let failed = 0
  try {
    for (const spec of list) {
      console.log(`→ ${spec.name}`)
      const page = await browser.newPage()
      try {
        await page.goto(`http://localhost:${PORT}/${spec.url}`, {
          waitUntil: 'networkidle0',
          timeout: 60000,
        })
        if (spec.waitFor) {
          await page.waitForSelector(spec.waitFor, {
            visible: true,
            timeout: 30000,
          })
        }
        for (const action of spec.actions ?? []) {
          await runAction(page, action)
        }
        await delay(spec.settle ?? 1200)
        await capture(page, spec)
      } catch (e) {
        failed++
        console.error(`  ✗ ${spec.name}: ${e.message}`)
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
    server.close()
  }
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

/**
 * Automated screenshots of the demo app for docs/user_guide.md, driven by a
 * real browser (puppeteer-core + the system Chrome — no bundled download).
 *
 * Usage:
 *   pnpm screenshots                          build the app, capture every spec
 *   node scripts/screenshots/generate.mjs --filter=colorscheme,domains   subset
 *   node scripts/screenshots/generate.mjs --headed       watch one window at a time
 *   node scripts/screenshots/generate.mjs --check        flakiness check, no writes
 *   node scripts/screenshots/generate.mjs --force        rewrite every PNG
 *
 * It serves packages/app/dist statically, navigates the app per spec
 * (scripts/screenshots/specs.mjs), runs any click/wait actions, captures each
 * spec to a temp PNG, optimizes it, then writes docs/media/<name>.png only when
 * the content actually changed (see image-pipeline.mjs). Build the app first
 * (the pnpm script does this).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer-core'

import {
  commitScreenshot,
  optimizePng,
  pngDiffFraction,
} from './image-pipeline.mjs'
import {
  delay,
  findChrome,
  flag,
  listOpt,
  numOpt,
  startStaticServer,
} from './lib.mjs'
import { specs } from './specs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const appDist = path.join(repoRoot, 'packages', 'app', 'dist')
const outDir = path.join(repoRoot, 'docs', 'media')
const PORT = 5599
// Below this fraction of differing pixels a re-render keeps the committed PNG.
// Headless-Chrome sub-pixel glyph jitter drifts text-heavy shots ~0.2% run to
// run; 0.5% absorbs that while still letting a real edit through.
const DEFAULT_DIFF_THRESHOLD = 0.005

const headed = flag('headed')
const force = flag('force')
const check = flag('check')
const exact = flag('exact')
const filterTokens = listOpt('filter')
const diffThreshold = numOpt('diff-threshold', DEFAULT_DIFF_THRESHOLD)
const concurrency = numOpt('concurrency', headed ? 1 : 4)

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

// Fail a spec whose viewer body rendered empty — the app shell always paints
// its border box, so a header-but-no-content capture still "succeeds" and slips
// through review. A healthy viewer (import form included) fills its body.
async function assertViewerRendered(page, name) {
  const empty = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="msaview"]')
    return !box || box.childElementCount === 0
  })
  if (empty) {
    throw new Error(`${name}: viewer rendered blank`)
  }
}

// Freeze CSS transitions/animations so MUI menu/dialog fly-outs snap to their
// settled state, then wait for the browser to actually rasterize the current
// DOM (a single rAF fires before paint; two chained rAFs guarantee a committed
// frame, and the trailing timeout gives a freshly-composited portal layer a
// beat to paint) before capturing.
async function shoot(page, spec, file) {
  await page.evaluate(() => {
    const id = '__screenshot_freeze_anim'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent =
        '*,*::before,*::after{transition:none !important;animation:none !important;}'
      document.head.appendChild(style)
    }
  })
  await page.evaluate(
    () =>
      new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 50)
          })
        })
      }),
  )
  if (spec.clip === 'viewer') {
    const el = await page.waitForSelector('[data-testid="msaview"]', {
      visible: true,
      timeout: 20000,
    })
    await el.screenshot({ path: file })
  } else {
    await page.screenshot({ path: file })
  }
}

// Drive the page through the spec and produce one finished, optimized PNG in a
// temp file. `suffix` keeps the two captures of a --check run from colliding.
async function renderSpecToTemp(browser, spec, suffix = '') {
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
    await assertViewerRendered(page, spec.name)
    const tmp = path.join(
      os.tmpdir(),
      `msa-shot-${process.pid}-${spec.name}${suffix}.png`,
    )
    await shoot(page, spec, tmp)
    optimizePng(tmp)
    return tmp
  } finally {
    await page.close()
  }
}

function launch(executablePath, spec) {
  return puppeteer.launch({
    headless: !headed,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
    defaultViewport: {
      width: spec.viewportWidth ?? 1200,
      height: spec.viewportHeight ?? 720,
      deviceScaleFactor: 2,
    },
  })
}

async function captureSpec(executablePath, spec) {
  console.log(`→ ${spec.name}`)
  // Fresh browser per spec avoids service-worker caching between navigations.
  const browser = await launch(executablePath, spec)
  try {
    const tmp = await renderSpecToTemp(browser, spec)
    const out = path.join(outDir, `${spec.name}.png`)
    commitScreenshot(tmp, out, spec.name, {
      force,
      diffThreshold: spec.diffThreshold ?? diffThreshold,
    })
  } finally {
    await browser.close()
  }
}

// Render the spec twice (fresh browser each) and compare the two captures to
// each other. Drift past threshold means the spec is nondeterministic and would
// churn its committed PNG on every regen. Doesn't touch committed files.
async function checkSpec(executablePath, spec) {
  console.log(`→ ${spec.name}`)
  const render = suffix =>
    launch(executablePath, spec).then(async browser => {
      try {
        return await renderSpecToTemp(browser, spec, suffix)
      } finally {
        await browser.close()
      }
    })
  const a = await render('-a')
  const b = await render('-b')
  const limit = spec.diffThreshold ?? diffThreshold
  const frac = pngDiffFraction(a, b)
  fs.rmSync(a, { force: true })
  fs.rmSync(b, { force: true })
  const flaky = frac === null || frac >= limit
  const pct = frac === null ? 'size-mismatch' : `${(frac * 100).toFixed(3)}%`
  console.log(
    `  ${flaky ? '✗' : '✓'} ${spec.name} ${flaky ? `FLAKY (${pct})` : `stable (${pct})`}`,
  )
  return flaky
}

async function main() {
  if (!fs.existsSync(appDist)) {
    console.error(
      `Build not found at ${appDist}. Run: pnpm --filter app exec vite build`,
    )
    process.exit(1)
  }
  const executablePath = findChrome()

  const list =
    filterTokens.length > 0
      ? specs.filter(s =>
          filterTokens.some(t => (exact ? s.name === t : s.name.includes(t))),
        )
      : specs
  if (list.length === 0) {
    console.error(`No specs match filter: ${filterTokens.join(',')}`)
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })
  console.log(
    `${check ? 'Checking' : 'Generating'} ${list.length} screenshot(s) with concurrency ${concurrency}`,
  )

  const server = await startStaticServer(PORT, appDist)
  const failures = []
  const flaky = []
  const queue = [...list]
  const worker = async () => {
    while (queue.length > 0) {
      const spec = queue.shift()
      try {
        if (check) {
          if (await checkSpec(executablePath, spec)) {
            flaky.push(spec.name)
          }
        } else {
          await captureSpec(executablePath, spec)
        }
      } catch (e) {
        failures.push({ name: spec.name, error: e.message })
        console.error(`  ✗ ${spec.name}: ${e.message}`)
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  } finally {
    server.close()
  }

  if (flaky.length > 0) {
    console.error(`\nFLAKY (${flaky.length}): ${flaky.join(', ')}`)
  }
  if (failures.length > 0) {
    console.error(`\nFAILED (${failures.length}):`)
    for (const { name, error } of failures) {
      console.error(`  • ${name}: ${error}`)
    }
  }
  if (failures.length > 0 || flaky.length > 0) {
    process.exit(1)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

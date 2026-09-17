/**
 * Automated screenshots of the demo app for docs/user_guide.md, driven by a
 * browser (puppeteer-core with the system Chrome, no bundled download).
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
 * the content changed (see image-pipeline.mjs). Build the app first
 * (the pnpm script does this).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import puppeteer from 'puppeteer-core'

import { applyAnnotations } from './annotations.mjs'
import {
  commitScreenshot,
  optimizePng,
  pngDiffFraction,
} from './image-pipeline.mjs'
import {
  BROWSER_ARGS,
  delay,
  findChrome,
  flag,
  listOpt,
  mediaDir,
  numOpt,
  repoRoot,
  startStaticServer,
  tmpShot,
} from './lib.mjs'
import { specs } from './specs.mjs'

const appDist = path.join(repoRoot, 'packages', 'app', 'dist')
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
const PORT = numOpt('port', 5599)

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

// Fail a spec whose viewer body rendered empty. The app shell always paints its
// border box, so a capture with a header and no content would otherwise pass.
// A loaded viewer (import form included) fills its body.
// Whether the viewer painted, asked of the page. The child-count half passes on
// a viewer that mounted and drew nothing, since the toolbar and the tracks fill
// the body on their own, so the pixels of the alignment canvases answer the rest
// of it. A drawn alignment is never one flat color, and the scan stops at the
// first pixel that differs, so the cost in the normal case is a few pixels.
//
// This does NOT catch the blank colorscheme-clustalx that reached docs/media.
// That page was fine and the capture dropped its layers, which is what
// `captureElement` above is for. Both checks are worth keeping: one reads the
// page, the other decides how the page is read.
async function assertViewerRendered(page, name) {
  const problem = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="msaview"]')
    if (!box || box.childElementCount === 0) {
      return 'viewer rendered blank'
    }
    // A figure with no alignment is a real one (a tree, a GFF and a features
    // panel draw at zero columns), so the model says whether there is anything
    // to paint before the pixels are asked about.
    const model = window.MSAVIEW_MODEL
    if (!model?.numColumns || !model.numRows) {
      return undefined
    }
    const painted = [
      ...(box
        .querySelector('[data-testid="msa_canvas"]')
        ?.querySelectorAll('canvas') ?? []),
    ].some(c => {
      const ctx = c.width > 0 && c.height > 0 ? c.getContext('2d') : null
      if (!ctx) {
        return false
      }
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      for (let i = 4; i < data.length; i += 4) {
        if (
          data[i] !== data[0] ||
          data[i + 1] !== data[1] ||
          data[i + 2] !== data[2] ||
          data[i + 3] !== data[3]
        ) {
          return true
        }
      }
      return false
    })
    // The overlay layer is legitimately one flat transparent color whenever
    // nothing is highlighted, so this asks whether ANY block painted rather
    // than picking a canvas and trusting it to be the right one.
    return painted
      ? undefined
      : `${model.numColumns} columns by ${model.numRows} rows, and every alignment canvas is one flat color`
  })
  if (problem) {
    throw new Error(`${name}: ${problem}`)
  }
}

// Capture the whole viewport, then cut the element out of it inside the page.
//
// Chrome re-composites the page against the clip rectangle that
// `Page.captureScreenshot` carries, and it reads the surface back before the
// compositor has rastered every layer. The frame that comes back has the tree,
// the row labels and the alignment missing while the toolbar and the tracks
// draw, which is how a blank colorscheme-clustalx reached docs/media.
// `assertViewerRendered` passes it, because the page itself is fine: the model,
// the block count and the canvas pixels all read the same as a good run.
//
// Measured on 16 cores loaded with 24 busy loops, capturing one spec 150 times
// at concurrency 12: 4 clipped captures came back blank and 0 of 300 crops did.
// Every clipped path does it, an element screenshot, a `clip` on a page
// screenshot and `captureBeyondViewport` alike, while 360 unclipped viewport
// captures under the same load produced none. The crop is pixel-identical to a
// clipped capture that worked (ImageMagick AE 0), so no committed figure moves.
//
// The crop rounds the way puppeteer rounds a clip, reads getBoundingClientRect,
// whose origin is the viewport the capture covers, and clamps to the viewport,
// which is the intersection puppeteer takes. The scroll matters for the two
// kinase-pocket compose parts, whose viewer stands ~8px taller than the frame
// they set: puppeteer scrolls a partly visible element into view before it
// clips, and dropping that cut 14px off the stacked figure.
async function captureElement(page, selector, file) {
  await page.evaluate(sel => {
    document.querySelector(sel).scrollIntoViewIfNeeded()
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  }, selector)
  const viewport = await page.screenshot({ encoding: 'base64' })
  const url = await page.evaluate(
    async (data, sel) => {
      const box = document.querySelector(sel).getBoundingClientRect()
      const { devicePixelRatio: dpr, innerWidth, innerHeight } = window
      const x = Math.max(Math.round(box.x), 0)
      const y = Math.max(Math.round(box.y), 0)
      const width = Math.min(Math.round(box.right), innerWidth) - x
      const height = Math.min(Math.round(box.bottom), innerHeight) - y
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas
        .getContext('2d')
        .drawImage(
          img,
          Math.round(x * dpr),
          Math.round(y * dpr),
          canvas.width,
          canvas.height,
          0,
          0,
          canvas.width,
          canvas.height,
        )
      return canvas.toDataURL('image/png')
    },
    viewport,
    selector,
  )
  fs.writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))
}

// Freeze CSS transitions/animations so MUI menu/dialog fly-outs snap to their
// settled state, then wait for the browser to rasterize the current
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
    await page.waitForSelector('[data-testid="msaview"]', {
      visible: true,
      timeout: 20000,
    })
    await captureElement(page, '[data-testid="msaview"]', file)
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
    // after the settle, so a col/row anchor resolves against the geometry the
    // capture shows
    await applyAnnotations(page, spec.annotations, spec.name)
    const tmp = tmpShot(spec.name, suffix)
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
    args: BROWSER_ARGS,
    defaultViewport: {
      width: spec.viewportWidth ?? 1200,
      height: spec.viewportHeight ?? 720,
      deviceScaleFactor: 2,
    },
  })
}

async function captureSpec(executablePath, spec, partFiles) {
  console.log(`→ ${spec.name}`)
  // Fresh browser per spec avoids service-worker caching between navigations.
  const browser = await launch(executablePath, spec)
  try {
    const tmp = await renderSpecToTemp(browser, spec)
    // A `part` spec exists only to be stacked into a compose spec, so it keeps
    // its capture in temp and writes no PNG to docs/media.
    if (spec.part) {
      partFiles.set(spec.name, tmp)
      return
    }
    const out = path.join(mediaDir, `${spec.name}.png`)
    commitScreenshot(tmp, out, spec.name, {
      force,
      diffThreshold: spec.diffThreshold ?? diffThreshold,
    })
  } finally {
    await browser.close()
  }
}

// Stack a compose spec's already-captured parts into one figure. ImageMagick
// pads the narrower part to the wider one's width, so parts that differ in
// width (an unaligned block is fewer columns than the alignment built from it)
// stack left-aligned without rescaling.
function composeSpec(spec, partFiles) {
  console.log(`→ ${spec.name} (compose)`)
  const missing = spec.parts.filter(p => !partFiles.has(p))
  if (missing.length > 0) {
    throw new Error(`missing part capture(s): ${missing.join(', ')}`)
  }
  const out = path.join(mediaDir, `${spec.name}.png`)
  const tmp = tmpShot(spec.name, '-composed')
  execFileSync('magick', [
    ...spec.parts.map(p => partFiles.get(p)),
    spec.direction === 'horizontal' ? '+append' : '-append',
    tmp,
  ])
  optimizePng(tmp)
  commitScreenshot(tmp, out, spec.name, {
    force,
    diffThreshold: spec.diffThreshold ?? diffThreshold,
  })
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

  let list =
    filterTokens.length > 0
      ? specs.filter(s =>
          filterTokens.some(t => (exact ? s.name === t : s.name.includes(t))),
        )
      : specs
  if (list.length === 0) {
    console.error(`No specs match filter: ${filterTokens.join(',')}`)
    process.exit(1)
  }
  // A filter that selects a compose spec has to pull in the parts it stacks,
  // which the filter itself won't have matched by name.
  const needed = new Set(list.flatMap(s => s.parts ?? []))
  const pulled = specs.filter(s => needed.has(s.name) && !list.includes(s))
  list = [...list, ...pulled]

  fs.mkdirSync(mediaDir, { recursive: true })
  console.log(
    `${check ? 'Checking' : 'Generating'} ${list.length} screenshot(s) with concurrency ${concurrency}`,
  )

  const server = await startStaticServer(PORT, appDist)
  const failures = []
  const flaky = []
  const partFiles = new Map()
  // Compose specs stack parts, so they run after the render pool. Under --check
  // they're skipped: the append is deterministic given its parts, so there is
  // nothing to re-render and compare.
  const composeSpecs = check ? [] : list.filter(s => s.parts)
  const queue = list.filter(s => !s.parts)
  const worker = async () => {
    while (queue.length > 0) {
      const spec = queue.shift()
      try {
        if (check) {
          if (await checkSpec(executablePath, spec)) {
            flaky.push(spec.name)
          }
        } else {
          await captureSpec(executablePath, spec, partFiles)
        }
      } catch (e) {
        failures.push({ name: spec.name, error: e.message })
        console.error(`  ✗ ${spec.name}: ${e.message}`)
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    for (const spec of composeSpecs) {
      try {
        composeSpec(spec, partFiles)
      } catch (e) {
        failures.push({ name: spec.name, error: e.message })
        console.error(`  ✗ ${spec.name}: ${e.message}`)
      }
    }
  } finally {
    for (const file of partFiles.values()) {
      fs.rmSync(file, { force: true })
    }
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

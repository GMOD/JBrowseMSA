/**
 * The figures of docs/tutorials/static_first.md, captured from the hosted page
 * in packages/app/public/data/static_first served locally:
 *
 *   node scripts/screenshots/static-first-figures.mjs [--port=8124] [--force]
 *
 * It rasterizes nlrp1.svg with rsvg-convert, then loads the page, which
 * fetches the viewer bundle from unpkg and the NLRP1 files from gmod.org, so
 * the capture needs the network. It captures the page as it loads, clicks
 * "Explore the alignment", and captures the viewer that replaces the figure,
 * printing the box layout before and after the click. Last it serves the
 * page with step 5's IntersectionObserver loop in place of the click handler,
 * 2000 pixels down, and prints the bundle requests before and after a scroll.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { launch } from 'puppeteer-core'

import { commitScreenshot, optimizePng } from './image-pipeline.mjs'
import {
  BROWSER_ARGS,
  appDataDir,
  delay,
  findChrome,
  flag,
  mediaDir,
  numOpt,
  startStaticServer,
  tmpShot,
} from './lib.mjs'

const port = numOpt('port', 8124)
const dir = path.join(appDataDir, 'static_first')
const server = await startStaticServer(port, dir)
const browser = await launch({
  headless: true,
  executablePath: findChrome(),
  args: BROWSER_ARGS,
})

function commit(tmp, name) {
  optimizePng(tmp)
  commitScreenshot(tmp, path.join(mediaDir, `${name}.png`), name, {
    force: flag('force'),
    diffThreshold: 0.01,
  })
}

async function capture(page, name) {
  const tmp = tmpShot(name)
  await page.screenshot({ path: tmp })
  commit(tmp, name)
}

const nearbyLoop = `const nearby = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              nearby.unobserve(entry.target)
              explore(entry.target)
            }
          }
        },
        { rootMargin: '200px' },
      )
      for (const box of document.querySelectorAll('.msa-embed')) {
        nearby.observe(box)
      }
`

function scrollPage() {
  const html = fs
    .readFileSync(path.join(dir, 'index.html'), 'utf8')
    .replace('<h1>', '<div style="height: 2000px"></div><h1>')
    .replace(/for \(const box of document[\s\S]*?\n {6}\}\n/, nearbyLoop)
  if (!html.includes('IntersectionObserver')) {
    throw new Error('index.html has no click loop to replace')
  }
  return html
}

// the box's height and where the paragraph under it starts
const layout = page =>
  page.$eval('.msa-embed', el => {
    const below = el.nextElementSibling.getBoundingClientRect().top
    return `box ${el.getBoundingClientRect().height} px, paragraph at ${below} px`
  })

try {
  const svg = tmpShot('static_first-svg')
  execFileSync('rsvg-convert', [
    '--zoom=2',
    '--background-color=white',
    path.join(dir, 'nlrp1.svg'),
    '-o',
    svg,
  ])
  commit(svg, 'static_first-svg')

  const page = await browser.newPage()
  page.on('pageerror', e => {
    console.log(`  [pageerror] ${e.message}`)
  })
  await page.setViewport({ width: 960, height: 560, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' })
  console.log(`before the click: ${await layout(page)}`)
  await capture(page, 'static_first-page')

  await page.click('.msa-explore')
  await page.waitForSelector('[data-testid="msa_canvas"] canvas', {
    timeout: 60_000,
  })
  await page.mouse.move(0, 0)
  await delay(2000)
  console.log(`after the click: ${await layout(page)}`)
  await capture(page, 'static_first-explore')

  const scroll = await browser.newPage()
  await scroll.setViewport({ width: 960, height: 560 })
  await scroll.setRequestInterception(true)
  let bundleRequests = 0
  scroll.on('request', req => {
    if (req.url().includes('/bundle/index.js')) {
      bundleRequests++
    }
    if (req.url().endsWith('/scroll')) {
      void req.respond({ contentType: 'text/html', body: scrollPage() })
    } else {
      void req.continue()
    }
  })
  await scroll.goto(`http://localhost:${port}/scroll`, {
    waitUntil: 'networkidle0',
  })
  console.log(`scroll page at load: ${bundleRequests} bundle requests`)
  await scroll.evaluate(() => {
    window.scrollTo(0, 1500)
  })
  await scroll.waitForSelector('[data-testid="msa_canvas"] canvas', {
    timeout: 60_000,
  })
  console.log(`scroll page after scrolling: ${bundleRequests} bundle requests`)
} finally {
  await browser.close()
  server.close()
}

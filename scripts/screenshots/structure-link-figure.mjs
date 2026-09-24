/**
 * The figure for website/src/pages/tutorials/structure_link.astro, captured
 * from a running site (`pnpm --filter website dev` or `astro preview`):
 *
 *   node scripts/screenshots/structure-link-figure.mjs \
 *     --url=http://127.0.0.1:4321/JBrowseMSA/tutorials/structure_link
 *
 * The page loads Mol* and the 6VXX entry from RCSB, so the capture needs the
 * network and a WebGL context, which headless Chrome gets from SwiftShader.
 * It sweeps the pointer over the alignment and the structure, prints each
 * distinct status line, then hovers and clicks the first SARS-CoV-2 residue
 * with coordinates and captures the island. It then switches to the
 * hemoglobin set and prints its statuses too.
 */
import path from 'node:path'

import puppeteer from 'puppeteer-core'

import { commitScreenshot, optimizePng } from './image-pipeline.mjs'
import {
  BROWSER_ARGS,
  delay,
  findChrome,
  flag,
  mediaDir,
  opt,
  tmpShot,
} from './lib.mjs'

const url = opt(
  'url',
  'http://127.0.0.1:4321/JBrowseMSA/tutorials/structure_link',
)
const name = 'structure_link-spike'
const mappedHover = /^SARS-CoV-2 residue \d+ · 6VXX chain A residue \d+$/

const status = page =>
  page.$eval('.structure-link-status', el => el.textContent.trim())

async function sweep(page, selector, rows, cols) {
  const box = await (await page.$(selector)).boundingBox()
  const seen = new Map()
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const x = box.x + (box.width * c) / (cols + 1)
      const y = box.y + (box.height * r) / (rows + 1)
      await page.mouse.move(x, y)
      await delay(40)
      const text = await status(page)
      if (!seen.has(text)) {
        seen.set(text, { x, y })
      }
    }
  }
  return seen
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: findChrome(),
  args: [...BROWSER_ARGS, '--enable-unsafe-swiftshader', '--use-gl=angle'],
})
try {
  const page = await browser.newPage()
  page.on('console', msg => {
    if (['error', 'warn'].includes(msg.type())) {
      console.log(`  [console.${msg.type()}] ${msg.text()}`)
    }
  })
  page.on('pageerror', e => {
    console.log(`  [pageerror] ${e.message}`)
  })
  await page.setViewport({ width: 1100, height: 1300, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 })
  await page.waitForSelector('.structure-link-canvas canvas', {
    timeout: 120_000,
  })
  await page.waitForFunction(
    () => !document.querySelector('.structure-link-loading'),
    { timeout: 120_000 },
  )
  await page.waitForFunction(
    () => document.querySelector('.structure-link-mapped')?.textContent,
    { timeout: 60_000 },
  )
  await delay(2000)
  await page.evaluate(() => {
    document.querySelector('astro-dev-toolbar')?.remove()
  })
  const island = await page.$('.structure-link')
  await island.scrollIntoView()

  const msaSelector = '.structure-link > div:nth-of-type(2)'
  const alignment = await sweep(page, msaSelector, 24, 12)
  console.log('alignment hover statuses:')
  for (const text of alignment.keys()) {
    console.log(`  ${text}`)
  }
  const structure = await sweep(page, '.structure-link-canvas', 8, 8)
  console.log('structure hover statuses:')
  for (const text of structure.keys()) {
    console.log(`  ${text}`)
  }
  console.log(
    `mapped: ${await page.$eval('.structure-link-mapped', el => el.textContent)}`,
  )
  const problems = await page.$$eval('.structure-link-problem', els =>
    els.map(el => el.textContent),
  )
  console.log(`problems: ${problems.length ? problems.join('; ') : 'none'}`)

  const target = [...alignment].find(([text]) => mappedHover.test(text))
  if (!target) {
    throw new Error('no hover over the alignment reached 6VXX chain A')
  }
  const [, { x, y }] = target
  await page.mouse.move(x, y)
  await page.mouse.click(x, y)
  await delay(3000)
  await page.mouse.move(x, y + 1)
  await delay(500)
  console.log(`captured with: ${await status(page)}`)

  const tmp = tmpShot(name)
  await island.screenshot({ path: tmp })
  optimizePng(tmp)
  commitScreenshot(tmp, path.join(mediaDir, `${name}.png`), name, {
    force: flag('force'),
    diffThreshold: 0.01,
  })

  await page.click('.structure-link-datasets button:nth-of-type(2)')
  await page.waitForFunction(
    () =>
      document.querySelector('.structure-link-mapped')?.textContent ===
        'Mapped: Human onto 2HHB chain A, Human onto 2HHB chain B' &&
      !document.querySelector('.structure-link-loading'),
    { timeout: 120_000 },
  )
  await delay(2000)
  console.log('hemoglobin alignment hover statuses on the Human row:')
  for (const text of (await sweep(page, msaSelector, 48, 8)).keys()) {
    if (text.startsWith('Human')) {
      console.log(`  ${text}`)
    }
  }
  console.log('hemoglobin structure hover statuses:')
  for (const text of (
    await sweep(page, '.structure-link-canvas', 16, 16)
  ).keys()) {
    console.log(`  ${text}`)
  }
} finally {
  await browser.close()
}

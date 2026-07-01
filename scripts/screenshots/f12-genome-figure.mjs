/**
 * Capture the F12 genome-browser figure: the F12 locus in a JBrowse
 * LinearGenomeView with the canonical RefSeq transcript and the Multiz 470-way
 * mammal MAF track (which includes two cetaceans, dolphin + blue whale). This is
 * the genomic complement to the F12 gene-loss MSA figures (docs/media/
 * f12-exon-architecture.png, f12-frameshift.png) — same gene, shown in genomic
 * coordinates with introns and the raw comparative alignment, deliberately a
 * SEPARATE view from the curated CDS alignment rather than duplicating it in one
 * connected session.
 *
 * Unlike the connected genome+MSA figures (jbrowse-figures.mjs, which needs a
 * local webgl-poc build), this is a plain genome view, so it captures cleanly
 * against the published jbrowse-web + the hosted combined config.
 *
 * Usage: node scripts/screenshots/f12-genome-figure.mjs [--force] [--headed]
 *        [--jbrowse-url=https://jbrowse.org/code/jb2/webgl-poc]
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

const force = flag('force')
const headed = flag('headed')
const jbrowseBase = (
  opt('jbrowse-url', process.env.JBROWSE_WEB_URL) ||
  'https://jbrowse.org/code/jb2/webgl-poc'
).replace(/\/$/, '')

const CONFIG =
  'https://gmod.org/JBrowseMSA/demo/data/jbrowse-msa-combined-config.json'

// F12 spans chr5:177,402,141-177,409,564 (minus strand, 14 exons). Show the
// whole locus so the exon/intron structure and the MAF conservation read at a
// glance; colorByCDS shades the coding frame.
const session = {
  views: [
    {
      type: 'LinearGenomeView',
      id: 'lgv-f12',
      assembly: 'hg38',
      loc: 'chr5:177,401,800-177,409,900',
      colorByCDS: true,
      tracks: ['hg38-ncbiRefSeqSelect', 'hg38-multiz470way'],
    },
  ],
}

const url =
  `${jbrowseBase}/?config=${encodeURIComponent(CONFIG)}` +
  `&session=spec-${encodeURIComponent(JSON.stringify(session))}`

async function main() {
  const executablePath = findChrome()
  const browser = await puppeteer.launch({
    headless: !headed,
    executablePath,
    args: BROWSER_ARGS,
    defaultViewport: { width: 1600, height: 760, deviceScaleFactor: 2 },
  })
  try {
    const page = await browser.newPage()
    console.log(`→ genome-browser-f12 (${jbrowseBase})`)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 })
    // wait for the MAF track to paint its rows (the bigMaf fetch from UCSC +
    // plugin render takes a while)
    await page.waitForSelector('canvas', { visible: true, timeout: 60000 })
    await delay(18000)
    const tmp = tmpShot('genome-browser-f12')
    await page.screenshot({ path: tmp })
    optimizePng(tmp)
    commitScreenshot(
      tmp,
      path.join(mediaDir, 'genome-browser-f12.png'),
      'genome-browser-f12',
      { force, diffThreshold: 0.02 },
    )
  } finally {
    await browser.close()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

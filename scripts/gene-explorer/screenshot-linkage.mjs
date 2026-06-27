/**
 * Reproducible gallery screenshot of the gene explorer's three-way linkage:
 * genome <-> alignment <-> AlphaFold structure, all connected, with a span of
 * protein residues selected so the SAME codons light in the LinearGenomeView,
 * the MSA columns, and the 3D structure at once.
 *
 * Drives the deployed gene-explorer page exactly like a user would (so the
 * session spec is the real one), opens it in headless swiftshader-WebGL Chrome,
 * selects the residue range on the structure model (what a click in molstar
 * does), waits for molstar + the highlights to paint, and writes the PNG.
 *
 *   node scripts/gene-explorer/screenshot-linkage.mjs [SYMBOL] [startRes] [endRes]
 * defaults: TP53, residues 197-202 (a 15 bp / 5-codon span; chr17 minus strand)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer-core'

import { delay, findChrome } from '../screenshots/lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const OUT = path.join(repoRoot, 'docs', 'media', 'gene-explorer-protein3d-linkage.png')

const SYMBOL = process.argv[2] ?? 'TP53'
const START = Number(process.argv[3] ?? 197)
const END = Number(process.argv[4] ?? 202)
const SITE = `https://gmod.org/JBrowseMSA/gene-explorer/?gene=${SYMBOL}`

const browser = await puppeteer.launch({
  headless: true,
  executablePath: findChrome(),
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
  ],
  defaultViewport: { width: 1800, height: 980, deviceScaleFactor: 2 },
})
try {
  const page = await browser.newPage()
  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 60000 })
  let url
  for (let i = 0; i < 40; i++) {
    url = await page.evaluate(
      () =>
        [...document.querySelectorAll('a')].find(a =>
          (a.href || '').includes('session=spec-'),
        )?.href,
    )
    if (url) break
    await delay(1000)
  }
  if (!url) throw new Error('gene-explorer page did not produce a JBrowse URL')

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  for (let i = 0; i < 15; i++) {
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x =>
        /trust|yes|continue/i.test(x.textContent || ''),
      )
      if (b) { b.click(); return true }
      return false
    })
    if (clicked) break
    await delay(1000)
  }

  // wait for the structure to load + align + connect
  for (let i = 0; i < 90; i++) {
    const ready = await page.evaluate(() => {
      const s = window.JBrowseRootModel?.session?.views
        ?.find(v => v.type === 'ProteinView')?.structures?.[0]
      return !!s?.pairwiseAlignment && !!s?.connectedView
    })
    if (ready) break
    await delay(2000)
  }

  // select the residue span on the structure: lights the codons in the LGV
  // (clickGenomeHighlights), the MSA columns, and the 3D structure together
  const region = await page.evaluate(
    (start, end) => {
      const s = window.JBrowseRootModel.session.views
        .find(v => v.type === 'ProteinView').structures[0]
      s.setClickedStructureRange({ start, end })
      const h = s.clickGenomeHighlights
      return h?.length ? { ...h[0] } : undefined
    },
    START,
    END,
  )
  console.log('selected genome region:', JSON.stringify(region))

  // let molstar paint the structure + the highlight overlays settle
  await delay(30000)
  await page.screenshot({ path: OUT })
  console.log(`wrote ${OUT}`)
} finally {
  await browser.close()
}

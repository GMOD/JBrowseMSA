/**
 * DRAFT figures for the Apollo renewal: one JBrowse combined view that shows
 *   (top)  a LinearGenomeView of the F12 locus with the RefSeq gene annotation
 *          track (the "annotation track" the figure needs to convey)
 *   (below) the react-msaview MsaView: the curated F12 cetacean CDS DNA
 *          alignment + species tree + the 14-exon overlay.
 *
 * Two variants are rendered:
 *   - overview: small colWidth so the whole exon architecture reads as colored
 *     bands down the tree (annotation lifted across every species).
 *   - closeup:  base resolution, scrolled to the shared cetacean frameshift
 *     (column 205) where the four cetaceans carry a 1bp deletion the others lack.
 *
 * Deliberately NO MAF track here: a MAF track + the MsaView would show the same
 * alignment twice. One alignment representation, the on-message one.
 *
 * Session data is inlined (stockholm + exon gff) so the URL is self-contained
 * and works against the published jbrowse-web + hosted combined config.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

import puppeteer from 'puppeteer-core'

const DATA = '/home/cdiesh/src/react-msaview/packages/app/public/data'
const msa = fs.readFileSync(path.join(DATA, 'f12-cetacean-cds.stock'), 'utf8')
const gff = fs.readFileSync(path.join(DATA, 'f12-cetacean-exons.gff'), 'utf8')

const JBROWSE = (process.env.JBROWSE_WEB_URL || 'https://jbrowse.org/code/jb2/webgl-poc').replace(/\/$/, '')
const CONFIG = 'https://gmod.org/JBrowseMSA/demo/data/jbrowse-msa-combined-config.json'

// matches @jbrowse/core sessionSharing.toUrlSafeB64 (zlib deflate + url-safe b64)
function toUrlSafeB64(str) {
  const b64 = zlib.deflateSync(Buffer.from(str, 'utf8')).toString('base64')
  return b64.replace(/=+$/, '').replaceAll('+', '-').replaceAll('/', '_')
}

const lgv = {
  id: 'lgv-f12',
  type: 'LinearGenomeView',
  colorByCDS: true,
  init: {
    assembly: 'hg38',
    loc: 'chr5:177,401,800-177,409,900',
    tracks: ['hg38-ncbiRefSeqSelect'],
  },
}

const msaBase = {
  id: 'msa-f12',
  type: 'MsaView',
  displayName: 'F12 CDS — cetacean gene loss (DNA, tree + exon model)',
  colorSchemeName: 'nucleotide',
  treeAreaWidth: 180,
  labelsAlignRight: true,
  highlightColumns: [205],
  data: { msa, tree: '', gff },
}

const variants = [
  {
    name: 'overview',
    viewport: { width: 1500, height: 900 },
    msa: { ...msaBase, colWidth: 0.62, rowHeight: 19, height: 470 },
  },
  {
    name: 'closeup',
    viewport: { width: 1500, height: 850 },
    // base resolution, scrolled so the cetacean-deletion column sits left-of-center
    msa: { ...msaBase, colWidth: 22, scrollX: -3960, rowHeight: 20, height: 510 },
  },
]

function buildUrl(msaView) {
  const session = {
    name: 'F12 cetacean gene loss — genome + MSA',
    views: [lgv, msaView],
  }
  return `${JBROWSE}/#config=${encodeURIComponent(CONFIG)}&session=encoded-${toUrlSafeB64(JSON.stringify(session))}`
}

async function capture(browser, variant) {
  const page = await browser.newPage()
  await page.setViewport({ ...variant.viewport, deviceScaleFactor: 2 })
  page.on('pageerror', e => console.log(`  [${variant.name} pageerror]`, e.message))
  const url = buildUrl(variant.msa)
  console.log(`→ ${variant.name} (url ${url.length} chars)`)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 })
  await page.waitForSelector('canvas', { visible: true, timeout: 60000 })
  await new Promise(r => setTimeout(r, 14000))
  const out = path.join(os.tmpdir(), `f12-combined-${variant.name}.png`)
  await page.screenshot({ path: out })
  await page.close()
  console.log('  wrote', out)
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  })
  try {
    for (const v of variants) {
      await capture(browser, v)
    }
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })

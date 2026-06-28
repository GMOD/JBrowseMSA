/**
 * Figures for the Apollo renewal: one JBrowse combined view that shows
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
 *
 * TWO OUTPUTS, TWO TARGETS:
 *   - the live "Open in JBrowse" URLs the gallery links (writeLinksModule) point
 *     at the PUBLISHED jbrowse-web + config + plugin — they must work for anyone.
 *   - the committed figure PNGs render against a LOCAL build when available, so
 *     the 14-exon overlay shows the palette fix (distinct colours) instead of the
 *     published plugin's pink-heavy 8-colour clamp. We serve, all over http on
 *     localhost (avoids https→http mixed-content blocking on the local plugin):
 *       - the local jbrowse-web build       (JBROWSE_WEB_BUILD / --jbrowse-build)
 *       - the local MsaView plugin dist      (MSAVIEW_PLUGIN_DIST / --plugin-dist)
 *       - the committed config, rewritten so its MsaView plugin URL is the local
 *         bundle (Protein3d dropped — unused here).
 *     The plugin dist must be built against THIS branch's react-msaview for the
 *     palette fix (see HANDOFF-dna-msa-comparative-genomics.md). If a local path
 *     is missing the capture falls back to the published target, so it still runs
 *     anywhere — just palette-stale.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

import puppeteer from 'puppeteer-core'

import { commitScreenshot, optimizePng } from './image-pipeline.mjs'
import { delay, findChrome, opt, startStaticServer } from './lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const outDir = path.join(repoRoot, 'docs', 'media')
const force = process.argv.includes('--force')

const DATA = path.join(repoRoot, 'packages', 'app', 'public', 'data')
const msa = fs.readFileSync(path.join(DATA, 'f12-cetacean-cds.stock'), 'utf8')
const gff = fs.readFileSync(path.join(DATA, 'f12-cetacean-exons.gff'), 'utf8')

// published targets — these back the live, clickable gallery URLs
const PUBLISHED_JBROWSE = 'https://jbrowse.org/code/jb2/webgl-poc'
const PUBLISHED_CONFIG =
  'https://gmod.org/JBrowseMSA/demo/data/jbrowse-msa-combined-config.json'

const PLUGIN_BUNDLE = 'jbrowse-plugin-msaview.umd.production.min.js'
const HOME = os.homedir()
const COMMITTED_CONFIG = path.join(DATA, 'jbrowse-msa-combined-config.json')

// local build paths used only to render publication-grade figure PNGs; both
// overridable, both fall back to the published target when absent.
const jbrowseBuild = opt(
  'jbrowse-build',
  process.env.JBROWSE_WEB_BUILD ||
    path.join(HOME, 'src/jbrowse-components/products/jbrowse-web/build'),
)
const pluginDist = opt(
  'plugin-dist',
  process.env.MSAVIEW_PLUGIN_DIST ||
    path.join(HOME, 'src/jb2plugins/jbrowse-plugin-msaview/dist'),
)
const useLocalJbrowse = fs.existsSync(path.join(jbrowseBuild, 'index.html'))
const useLocalPlugin = fs.existsSync(path.join(pluginDist, PLUGIN_BUNDLE))

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

function buildUrl(jbrowseBase, configUrl, msaView) {
  const session = {
    name: 'F12 cetacean gene loss — genome + MSA',
    views: [lgv, msaView],
  }
  return `${jbrowseBase}/#config=${encodeURIComponent(configUrl)}&session=encoded-${toUrlSafeB64(JSON.stringify(session))}`
}

// Build the config the figure session loads: start from the committed combined
// config, keep only the MsaView plugin, point it at the locally-served bundle.
function writeLocalConfig(scratchDir, pluginUrl) {
  const config = JSON.parse(fs.readFileSync(COMMITTED_CONFIG, 'utf8'))
  config.plugins = config.plugins
    .filter(p => p.name === 'MsaView')
    .map(p => ({ ...p, url: pluginUrl }))
  const out = path.join(scratchDir, 'combined-config.local.json')
  fs.writeFileSync(out, JSON.stringify(config))
  return out
}

// A cross-origin config (local config + plugin on a different port from the
// jbrowse-web build) trips JBrowse's "this link contains unknown plugins" trust
// gate; click through it so the session actually loads.
async function clickTrust(page) {
  for (let i = 0; i < 20; i++) {
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x =>
        /trust/i.test(x.textContent || ''),
      )
      if (b) {
        b.click()
        return true
      }
      return false
    })
    if (clicked) {
      return
    }
    await delay(500)
  }
}

async function capture(browser, jbrowseBase, configUrl, variant) {
  const page = await browser.newPage()
  await page.setViewport({ ...variant.viewport, deviceScaleFactor: 2 })
  page.on('pageerror', e =>
    console.log(`  [${variant.name} pageerror]`, e.message),
  )
  const url = buildUrl(jbrowseBase, configUrl, variant.msa)
  console.log(`→ ${variant.name} (url ${url.length} chars)`)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 })
  await clickTrust(page)
  await page.waitForSelector('canvas', { visible: true, timeout: 60000 })
  await new Promise(r => setTimeout(r, 14000))
  const tmp = path.join(
    os.tmpdir(),
    `f12-combined-${variant.name}-${process.pid}.png`,
  )
  await page.screenshot({ path: tmp })
  await page.close()
  optimizePng(tmp)
  const name = `f12-combined-${variant.name}`
  commitScreenshot(tmp, path.join(outDir, `${name}.png`), name, {
    force,
    diffThreshold: 0.02,
  })
}

// The live session URL is self-contained (data inlined), so it works against the
// published jbrowse-web with no hosted files. Emit the two URLs as a generated
// module the gallery imports, keeping the opaque encoded blobs out of the page.
// These always target the PUBLISHED jbrowse + config (anyone can click them).
function writeLinksModule() {
  const constName = n => `f12Combined${n[0].toUpperCase()}${n.slice(1)}Url`
  const body = variants
    .map(
      v =>
        `export const ${constName(v.name)} = ${JSON.stringify(buildUrl(PUBLISHED_JBROWSE, PUBLISHED_CONFIG, v.msa))}`,
    )
    .join('\n')
  const out = path.resolve(
    __dirname,
    '..',
    '..',
    'packages',
    'website',
    'src',
    'lib',
    'f12CombinedLinks.ts',
  )
  fs.writeFileSync(
    out,
    `// GENERATED by scripts/screenshots/f12-combined-figure.mjs — do not edit.\n// Self-contained JBrowse session URLs (F12 alignment + exon gff inlined).\n${body}\n`,
  )
  console.log('wrote', out)
}

// Stand up the local jbrowse-web + plugin + rewritten config so the captured
// PNGs use the palette-fixed plugin. Returns the base+config the capture loads
// (published if the local build is unavailable) plus a cleanup thunk.
async function setupCaptureTarget() {
  const servers = []
  let jbrowseBase = PUBLISHED_JBROWSE
  let configUrl = PUBLISHED_CONFIG
  let scratch

  if (useLocalJbrowse) {
    servers.push(await startStaticServer(8131, jbrowseBuild))
    jbrowseBase = 'http://localhost:8131'
    console.log(`local jbrowse-web: ${jbrowseBuild}`)
  } else {
    console.log(`jbrowse-web build not found, capturing against ${jbrowseBase}`)
  }

  if (useLocalPlugin) {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'f12-combined-'))
    servers.push(await startStaticServer(8132, pluginDist))
    const pluginUrl = `http://localhost:8132/${PLUGIN_BUNDLE}`
    const localConfig = writeLocalConfig(scratch, pluginUrl)
    servers.push(await startStaticServer(8133, scratch))
    configUrl = `http://localhost:8133/${path.basename(localConfig)}`
    console.log(`local plugin dist: ${pluginDist}`)
  } else {
    console.log('plugin dist not found, capturing palette-stale published plugin')
  }

  const cleanup = () => {
    for (const s of servers) {
      s.close()
    }
    if (scratch) {
      fs.rmSync(scratch, { recursive: true, force: true })
    }
  }
  return { jbrowseBase, configUrl, cleanup }
}

async function main() {
  writeLinksModule()
  const { jbrowseBase, configUrl, cleanup } = await setupCaptureTarget()
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  })
  try {
    for (const v of variants) {
      await capture(browser, jbrowseBase, configUrl, v)
    }
  } finally {
    await browser.close()
    cleanup()
  }
}
main().catch(e => {
  console.error(e)
  process.exit(1)
})

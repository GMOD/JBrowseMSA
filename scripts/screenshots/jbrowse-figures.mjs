/**
 * Capture the JBrowse-integration figures for the "Genome browser" docs page,
 * declaratively. Each figure is one entry in the FIGURES list below: it names a
 * docs link (the `links` map in genome-browser.astro — the same declarative URL
 * the page ships, so figure and link can never drift) plus a few capture knobs
 * (settle time, whether to center the highlighted column, what to assert, an
 * optional annotation overlay). A single generic driver loads each link in a
 * real jbrowse-web and screenshots it; there is no per-figure imperative script.
 *
 *   genome-browser-src.png, genome-browser-braf-v600e.png,
 *   genome-browser-tp53-r248.png   (the connected protein<->genome links)
 *
 * Unlike the app screenshots (scripts/screenshots/generate.mjs, which serves the
 * self-contained demo app), these run the react-msaview JBrowse plugin *inside*
 * a real jbrowse-web. That needs a running jbrowse-web built from the webgl-poc
 * branch (LaunchView-LinearGenomeView id forwarding); the orchestrator
 * (generate-screenshots.mjs) points us at it via --jbrowse-url.
 *
 * To reflect the exact repo state (not whatever is deployed to gmod.org), we
 * serve packages/app/public/data ourselves and load a *locally rewritten* copy
 * of jbrowse-msa-combined-config.json with every gmod.org data URL pointed at
 * that local server. So a fresh braf-clinvar VCF or a bumped plugin `latest`
 * shows up here before it is deployed (and --plugin-dist swaps in a local plugin
 * build to preview a not-yet-published plugin change).
 *
 * The `expect` block on a figure is an assertion: the connected view must
 * resolve and the pre-highlighted column must carry the named residue, or the
 * capture fails — so a broken link can't silently ship a screenshot of itself.
 *
 * Usage (normally via `pnpm screenshots:all`, but standalone too):
 *   node scripts/screenshots/jbrowse-figures.mjs --jbrowse-url=http://localhost:3000
 *   node scripts/screenshots/jbrowse-figures.mjs --filter=braf,tp53
 *   node scripts/screenshots/jbrowse-figures.mjs --plugin-dist=/path/to/plugin/dist
 *   node scripts/screenshots/jbrowse-figures.mjs --force
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer-core'

import { commitScreenshot, optimizePng } from './image-pipeline.mjs'
import {
  delay,
  findChrome,
  flag,
  listOpt,
  numOpt,
  opt,
  startStaticServer,
} from './lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const dataDir = path.join(repoRoot, 'packages', 'app', 'public', 'data')
const outDir = path.join(repoRoot, 'docs', 'media')
const astroPage = path.join(
  repoRoot,
  'packages',
  'website',
  'src',
  'pages',
  'genome-browser.astro',
)

const GMOD_DATA = 'https://gmod.org/JBrowseMSA/demo/data'
const CONFIG_NAME = 'jbrowse-msa-combined-config.json'
const LOCAL_CONFIG_NAME = 'jbrowse-msa-combined-config.local.json'
const PLUGIN_BUNDLE = 'jbrowse-plugin-msaview.umd.production.min.js'
// the published plugin URL the committed config points at; --plugin-dist swaps
// this for a locally-served build so a not-yet-published plugin fix shows up
const PLUGIN_PUBLISHED =
  'https://jbrowse.org/plugins/jbrowse-plugin-msaview/latest/dist/' +
  PLUGIN_BUNDLE

// ---- args -----------------------------------------------------------------
const force = flag('force')
const jbrowseBase = (
  opt('jbrowse-url', process.env.JBROWSE_WEB_URL) || 'http://localhost:3000'
).replace(/\/$/, '')
const dataPort = numOpt('data-port', 8099)
const pluginPort = numOpt('plugin-port', 9100)
// path to a local jbrowse-plugin-msaview dist/ to use instead of the published
// `latest` bundle (env MSAVIEW_PLUGIN_DIST also accepted)
const pluginDist = opt('plugin-dist', process.env.MSAVIEW_PLUGIN_DIST)
const filterTokens = listOpt('filter')

// ---- the figures (declarative) --------------------------------------------
// link:           key in the `links` map of genome-browser.astro (the shipped
//                 declarative URL — single source of truth for the figure)
// settle:         ms to wait for tracks to paint before capturing
// centerHighlight:scroll the alignment so the pre-highlighted column is centered
// expect:         assertions — { connected, colChar } (colChar is the residue
//                 the highlighted query column must read)
const FIGURES = [
  {
    out: 'genome-browser-src',
    link: 'proteinLinked',
    settle: 9000,
    expect: { connected: true },
  },
  {
    out: 'genome-browser-braf-v600e',
    link: 'brafV600',
    settle: 9000,
    centerHighlight: true,
    expect: { connected: true, colChar: 'V' },
  },
  {
    out: 'genome-browser-tp53-r248',
    link: 'tp53R248',
    settle: 9000,
    centerHighlight: true,
    expect: { connected: true, colChar: 'R' },
  },
]

// ---- helpers --------------------------------------------------------------
// the `links` map literal in genome-browser.astro, parsed into { key: url }
function readLinks() {
  const astro = fs.readFileSync(astroPage, 'utf8')
  const links = {}
  const re = /\n {2}(\w+):\n {4}'([^']*)'/g
  let m
  while ((m = re.exec(astro)) !== null) {
    links[m[1]] = m[2]
  }
  return links
}

function decodeSpec(url) {
  return JSON.parse(
    decodeURIComponent(
      new URL(url).searchParams.get('session').replace(/^spec-/, ''),
    ),
  )
}

// Rewrite the committed combined config so every gmod.org data URL points at the
// local data server, and write it next to the original (served at /<name>). When
// pluginUrl is given (--plugin-dist), the published `latest` plugin URL is also
// swapped for it, so a not-yet-published plugin fix is exercised; otherwise the
// figure loads the same published plugin the docs link does.
function writeLocalConfig(dataBase, pluginUrl) {
  let raw = fs.readFileSync(path.join(dataDir, CONFIG_NAME), 'utf8')
  raw = raw.replaceAll(GMOD_DATA, dataBase)
  if (pluginUrl) {
    raw = raw.replace(PLUGIN_PUBLISHED, pluginUrl)
  }
  fs.writeFileSync(path.join(dataDir, LOCAL_CONFIG_NAME), raw)
  return `${dataBase}/${LOCAL_CONFIG_NAME}`
}

function retarget(obj, dataBase) {
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (typeof v === 'string') {
      obj[k] = v.replaceAll(GMOD_DATA, dataBase)
    } else if (v && typeof v === 'object') {
      retarget(v, dataBase)
    }
  }
}

// Take a real webgl-poc docs URL (?config=<gmod>&session=spec-<…>) and re-point
// it at the local jbrowse-web + local config + local data.
function localizeUrl(realUrl, { configUrl, dataBase }) {
  const spec = decodeSpec(realUrl)
  retarget(spec, dataBase)
  return (
    `${jbrowseBase}/?config=${encodeURIComponent(configUrl)}` +
    `&session=spec-${encodeURIComponent(JSON.stringify(spec))}`
  )
}

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
    await delay(1000)
  }
}

async function shootAndCommit(page, outName) {
  const tmp = path.join(os.tmpdir(), `msa-jb-${process.pid}-${outName}.png`)
  await page.screenshot({ path: tmp })
  optimizePng(tmp)
  commitScreenshot(tmp, path.join(outDir, `${outName}.png`), outName, {
    force,
    diffThreshold: 0.01,
  })
}

// Read the MSA model state for the assertions, and (when asked) scroll the
// alignment so the pre-highlighted column is centered — otherwise the figure
// opens on the N-terminus with the lit column (the whole point) off-screen.
function inspectAndCenter(page, { expectCol, queryName, center }) {
  return page.evaluate(
    (expectCol, queryName, center) => {
      const msa = window.JBrowseRootModel.session.views.find(
        v => v.type === 'MsaView',
      )
      const queryRow = msa.rows.find(r => r[0] === queryName)?.[1]
      if (center && expectCol !== undefined) {
        msa.setScrollX(msa.msaAreaWidth / 2 - expectCol * msa.colWidth)
      }
      return {
        connected: !!msa.connectedView,
        colChar: expectCol !== undefined ? queryRow?.[expectCol] : undefined,
        highlightedColumns: [...(msa.highlightedColumns || [])],
      }
    },
    expectCol,
    queryName,
    center,
  )
}

function checkExpectations(fig, result, expectCol) {
  const problems = []
  if (fig.expect?.connected && !result.connected) {
    problems.push('connectedView did not resolve')
  }
  if (fig.expect?.colChar && result.colChar !== fig.expect.colChar) {
    problems.push(`column char ${result.colChar} != ${fig.expect.colChar}`)
  }
  if (
    expectCol !== undefined &&
    !result.highlightedColumns.includes(expectCol)
  ) {
    problems.push(
      `highlightedColumns [${result.highlightedColumns}] missing ${expectCol}`,
    )
  }
  return problems
}

// ---- generic capture driver -----------------------------------------------
async function captureFigure(browser, fig, ctx, links) {
  const realUrl = links[fig.link]
  if (!realUrl) {
    throw new Error(`docs link '${fig.link}' not found in genome-browser.astro`)
  }
  const msaView = decodeSpec(realUrl).views.find(v => v.type === 'MsaView')
  const expectCol = msaView?.highlightColumns?.[0]
  const localUrl = localizeUrl(realUrl, ctx)

  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1135, deviceScaleFactor: 2 })
  try {
    page.on('pageerror', e => console.log(`  [${fig.out}]`, e.message))
    await page.goto(localUrl, { waitUntil: 'networkidle2', timeout: 120000 })
    await clickTrust(page)
    await delay(fig.settle)

    if (fig.expect || fig.centerHighlight) {
      const result = await inspectAndCenter(page, {
        expectCol,
        queryName: msaView?.querySeqName,
        center: !!fig.centerHighlight,
      })
      await delay(1500)
      const problems = checkExpectations(fig, result, expectCol)
      if (problems.length > 0) {
        throw new Error(problems.join('; '))
      }
    }

    await shootAndCommit(page, fig.out)
  } finally {
    await page.close()
  }
}

// ---- main -----------------------------------------------------------------
async function main() {
  const wants = fig =>
    filterTokens.length === 0 ||
    filterTokens.some(t => fig.out.includes(t) || fig.link.includes(t))

  // jbrowse-web must be up — these figures can't render without it
  const reachable = await fetch(`${jbrowseBase}/`, { method: 'HEAD' })
    .then(r => r.ok || r.status < 500)
    .catch(() => false)
  if (!reachable) {
    console.error(
      `\njbrowse-web not reachable at ${jbrowseBase}. Start the webgl-poc build, e.g.\n` +
        `  cd ~/src/jbrowse-components/products/jbrowse-web && pnpm start\n` +
        `then re-run (or pass --jbrowse-url=...). Skipping JBrowse figures.`,
    )
    process.exit(2)
  }

  const executablePath = findChrome()
  fs.mkdirSync(outDir, { recursive: true })
  const links = readLinks()
  const server = await startStaticServer(dataPort, dataDir)
  const dataBase = `http://localhost:${dataPort}`

  // optionally serve a local plugin build in place of the published `latest`
  let pluginServer
  let pluginUrl
  if (pluginDist) {
    if (!fs.existsSync(path.join(pluginDist, PLUGIN_BUNDLE))) {
      throw new Error(`no ${PLUGIN_BUNDLE} in --plugin-dist=${pluginDist}`)
    }
    pluginServer = await startStaticServer(pluginPort, pluginDist)
    pluginUrl = `http://localhost:${pluginPort}/${PLUGIN_BUNDLE}`
    console.log(`using local plugin build: ${pluginDist}`)
  }

  const ctx = { configUrl: writeLocalConfig(dataBase, pluginUrl), dataBase }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
    ],
  })

  const failures = []
  try {
    for (const fig of FIGURES.filter(wants)) {
      // a figure whose docs link was removed from genome-browser.astro is
      // skipped, not failed — the page is the source of truth for which
      // examples exist
      if (!links[fig.link]) {
        console.log(`↷ ${fig.out} (no '${fig.link}' link in the docs; skipped)`)
        continue
      }
      console.log(`→ ${fig.out}`)
      try {
        await captureFigure(browser, fig, ctx, links)
      } catch (e) {
        failures.push({ name: fig.out, error: e.message })
        console.error(`  ✗ ${fig.out}: ${e.message}`)
      }
    }
  } finally {
    await browser.close()
    server.close()
    pluginServer?.close()
    fs.rmSync(path.join(dataDir, LOCAL_CONFIG_NAME), { force: true })
  }

  if (failures.length > 0) {
    console.error(`\nFAILED (${failures.length}):`)
    for (const { name, error } of failures) {
      console.error(`  • ${name}: ${error}`)
    }
    process.exit(1)
  }
  console.log('\nJBrowse figures done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

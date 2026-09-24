/**
 * Capture the figure the tutorials/jbrowse_integration page shows. It is one
 * entry in the FIGURES list below: it names a docs link (a connected-session
 * const in website/src/lib/jbrowseLinks.ts, read from the module so a changed
 * link changes the figure) plus a few capture settings
 * (settle time, whether to center the highlighted column, what to assert, an
 * optional annotation overlay). One generic driver loads each link in
 * jbrowse-web and screenshots it.
 *
 *   genome-browser-tp53-protein3d.png  (the three-view genome+alignment+3D
 *                                       structure link, with a motif highlighted
 *                                       in all three; needs
 *                                       jbrowse-plugin-protein3d)
 *
 * The SRC, BRAF V600E and TP53 R248 sessions that page links as text are not
 * captured: no page shows a figure for them, and a PNG nothing renders goes
 * stale unseen.
 *
 * Unlike the app screenshots (scripts/screenshots/generate.mjs, which serves the
 * self-contained demo app), these run the react-msaview JBrowse plugin inside
 * jbrowse-web. That needs a running jbrowse-web built from main
 * (LaunchView-LinearGenomeView id forwarding); the orchestrator
 * (generate-screenshots.mjs) passes its address via --jbrowse-url.
 *
 * To capture the repo state instead of what gmod.org serves, the script serves
 * packages/app/public/data itself and loads a locally rewritten copy of
 * jbrowse-msa-combined-config.json with every gmod.org data URL pointed at that
 * local server. A fresh braf-clinvar VCF or a bumped plugin `latest` therefore
 * shows up before it is deployed. --plugin-dist and --protein3d-dist swap in a
 * local msaview or protein3d build to preview an unpublished change.
 *
 * The `expect` block on a figure is an assertion: the connected view must
 * resolve and the highlighted column must carry the named residue, or the
 * script captures no PNG and fails.
 *
 * Usage (normally via `pnpm screenshots:all`, but standalone too):
 *   node scripts/screenshots/jbrowse-figures.mjs --jbrowse-url=http://localhost:3000
 *   node scripts/screenshots/jbrowse-figures.mjs --filter=braf,tp53
 *   node scripts/screenshots/jbrowse-figures.mjs --plugin-dist=/path/to/plugin/dist
 *   node scripts/screenshots/jbrowse-figures.mjs --protein3d-dist=/path/to/protein3d/dist
 *   node scripts/screenshots/jbrowse-figures.mjs --force
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import puppeteer from 'puppeteer-core'

import { commitScreenshot, optimizePng } from './image-pipeline.mjs'
import {
  BROWSER_ARGS,
  appDataDir,
  clickTrust,
  delay,
  findChrome,
  flag,
  listOpt,
  mediaDir,
  numOpt,
  opt,
  repoRoot,
  startStaticServer,
  tmpShot,
} from './lib.mjs'

const dataDir = appDataDir
const outDir = mediaDir
const linksModule = path.join(
  repoRoot,
  'website',
  'src',
  'lib',
  'jbrowseLinks.ts',
)

const GMOD_DATA = 'https://gmod.org/JBrowseMSA/demo/data'
const CONFIG_NAME = 'jbrowse-msa-combined-config.json'
const LOCAL_CONFIG_NAME = 'jbrowse-msa-combined-config.local.json'
const PLUGIN_BUNDLE = 'jbrowse-plugin-msaview.umd.production.min.js'
// the published plugin URL the committed config points at; --plugin-dist swaps
// this for a locally served build so an unpublished plugin fix shows up
const PLUGIN_PUBLISHED =
  'https://jbrowse.org/plugins/jbrowse-plugin-msaview/latest/dist/' +
  PLUGIN_BUNDLE
// same idea for the protein3d plugin, which the three-view figure needs
const PROTEIN3D_BUNDLE = 'jbrowse-plugin-protein3d.umd.production.min.js'
const PROTEIN3D_PUBLISHED =
  'https://jbrowse.org/plugins/jbrowse-plugin-protein3d/latest/dist/' +
  PROTEIN3D_BUNDLE

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
// path to a local jbrowse-plugin-protein3d dist/ (env PROTEIN3D_PLUGIN_DIST)
const protein3dDist = opt('protein3d-dist', process.env.PROTEIN3D_PLUGIN_DIST)
const protein3dPort = numOpt('protein3d-port', 9101)
const filterTokens = listOpt('filter')

// ---- the figures (declarative) --------------------------------------------
// link:           connected-session const name in lib/jbrowseLinks.ts, whose
//                 URL the figure loads
// settle:         ms to wait for tracks to paint before capturing
// centerHighlight:scroll the alignment so the pre-highlighted column is centered
// expect:         assertions: { connected, colChar } (colChar is the residue
//                 the highlighted query column must read)
const FIGURES = [
  {
    // the three-view figure: genome + alignment + AlphaFold structure, all
    // connected, opened with the p53 nuclear export signal motif highlighted.
    // Longer settle: protein3d downloads the AlphaFold model, inits molstar, and
    // computes the structure<->transcript alignment before the selection draws.
    out: 'genome-browser-tp53-protein3d',
    link: 'tp53Protein3d',
    settle: 30000,
    // side-by-side layout (genome+alignment left, 3D structure right): wider so
    // both columns have room, height tuned so the content fills the frame
    viewport: { width: 1800, height: 980 },
    centerHighlight: true,
    expect: { connected: true },
    // assert the ProteinView resolved its connected genome view and the domain
    // selection was applied (the selected ranges seeded from initialSelection)
    expectProtein: { connected: true, selected: true },
  },
]

// ---- helpers --------------------------------------------------------------
function decodeSpec(url) {
  return JSON.parse(
    decodeURIComponent(
      new URL(url).searchParams.get('session').replace(/^spec-/, ''),
    ),
  )
}

// Rewrite the committed combined config so every gmod.org data URL points at the
// local data server, and write it next to the original (served at /<name>). When
// pluginUrl is given (--plugin-dist), it also replaces the published `latest`
// plugin URL; otherwise the figure loads the published plugin the docs link
// does.
function writeLocalConfig(dataBase, pluginUrl, protein3dUrl) {
  let raw = fs.readFileSync(path.join(dataDir, CONFIG_NAME), 'utf8')
  raw = raw.replaceAll(GMOD_DATA, dataBase)
  if (pluginUrl) {
    raw = raw.replace(PLUGIN_PUBLISHED, pluginUrl)
  }
  if (protein3dUrl) {
    raw = raw.replace(PROTEIN3D_PUBLISHED, protein3dUrl)
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

// Take a real docs URL (?config=<gmod>&session=spec-<…>) and re-point
// it at the local jbrowse-web + local config + local data.
function localizeUrl(realUrl, { configUrl, dataBase }) {
  const spec = decodeSpec(realUrl)
  retarget(spec, dataBase)
  return (
    `${jbrowseBase}/?config=${encodeURIComponent(configUrl)}` +
    `&session=spec-${encodeURIComponent(JSON.stringify(spec))}`
  )
}

async function shootAndCommit(page, outName) {
  const tmp = tmpShot(outName)
  await page.screenshot({ path: tmp })
  optimizePng(tmp)
  commitScreenshot(tmp, path.join(outDir, `${outName}.png`), outName, {
    force,
    diffThreshold: 0.01,
  })
}

// Read the MSA model state for the assertions, and (when asked) scroll the
// alignment so the highlighted column is centered; otherwise the figure opens
// on the N-terminus with the highlighted column off-screen.
function inspectAndCenter(page, { expectCol, centerCol, queryName, center }) {
  return page.evaluate(
    (expectCol, centerCol, queryName, center) => {
      const msa = window.JBrowseRootModel.session.views.find(
        v => v.type === 'MsaView',
      )
      const queryRow = msa.rows.find(r => r[0] === queryName)?.[1]
      // center on centerCol (the middle of a highlighted domain band) rather
      // than the first highlighted column, so a wide band reads centered
      const col = centerCol ?? expectCol
      if (center && col !== undefined) {
        msa.setScrollX(msa.msaAreaWidth / 2 - col * msa.colWidth)
      }
      return {
        connected: !!msa.connectedView,
        colChar: expectCol !== undefined ? queryRow?.[expectCol] : undefined,
        highlightedColumns: [...(msa.highlightedColumns || [])],
      }
    },
    expectCol,
    centerCol,
    queryName,
    center,
  )
}

// Read the ProteinView model for the three-view figure's assertions: that it
// resolved its connected genome view and that the declarative domain selection
// (the selected ranges, seeded from initialSelection) was applied. protein3d
// after 0.14 holds a list, clickedStructureRanges; 0.14 and before, one range.
function inspectProtein(page) {
  return page.evaluate(() => {
    const pv = window.JBrowseRootModel.session.views.find(
      v => v.type === 'ProteinView',
    )
    const structure = pv?.structures?.[0]
    return {
      exists: !!pv,
      connected: !!structure?.connectedView,
      ranges: structure?.clickedStructureRanges
        ? structure.clickedStructureRanges.map(r => ({ ...r }))
        : structure?.clickedStructureRange
          ? [{ ...structure.clickedStructureRange }]
          : [],
    }
  })
}

function checkProteinExpectations(fig, result) {
  const problems = []
  if (!result.exists) {
    problems.push('ProteinView did not resolve')
  }
  if (fig.expectProtein?.connected && !result.connected) {
    problems.push('ProteinView connectedView did not resolve')
  }
  if (fig.expectProtein?.selected && result.ranges.length === 0) {
    problems.push('ProteinView domain selection (initialSelection) not applied')
  }
  return problems
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
    throw new Error(`docs link '${fig.link}' not found in jbrowseLinks.ts`)
  }
  const msaView = decodeSpec(realUrl).views.find(v => v.type === 'MsaView')
  const highlightCols = msaView?.highlightColumns ?? []
  const expectCol = highlightCols[0]
  // for a multi-column domain band, center on its middle column
  const centerCol = highlightCols[Math.floor(highlightCols.length / 2)]
  const localUrl = localizeUrl(realUrl, ctx)

  const page = await browser.newPage()
  // a figure can override the viewport (the three-view protein3d figure is
  // taller, with a genome view, an alignment and the 3D structure)
  await page.setViewport({
    width: 1600,
    height: 1135,
    deviceScaleFactor: 2,
    ...fig.viewport,
  })
  try {
    page.on('pageerror', e => console.log(`  [${fig.out}]`, e.message))
    await page.goto(localUrl, { waitUntil: 'networkidle2', timeout: 120000 })
    await clickTrust(page)
    await delay(fig.settle)

    if (fig.expect || fig.centerHighlight) {
      const result = await inspectAndCenter(page, {
        expectCol,
        centerCol,
        queryName: msaView?.querySeqName,
        center: !!fig.centerHighlight,
      })
      await delay(1500)
      const problems = checkExpectations(fig, result, expectCol)
      if (problems.length > 0) {
        throw new Error(problems.join('; '))
      }
    }

    if (fig.expectProtein) {
      const proteinResult = await inspectProtein(page)
      const proteinProblems = checkProteinExpectations(fig, proteinResult)
      if (proteinProblems.length > 0) {
        throw new Error(proteinProblems.join('; '))
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

  // these figures need a running jbrowse-web
  const reachable = await fetch(`${jbrowseBase}/`, { method: 'HEAD' })
    .then(r => r.ok || r.status < 500)
    .catch(() => false)
  if (!reachable) {
    console.error(
      `\njbrowse-web not reachable at ${jbrowseBase}. Start the main build, e.g.\n` +
        `  cd ~/src/jbrowse-components/products/jbrowse-web && pnpm start\n` +
        `then re-run (or pass --jbrowse-url=...). Skipping JBrowse figures.`,
    )
    process.exit(2)
  }

  const executablePath = findChrome()
  fs.mkdirSync(outDir, { recursive: true })
  // Node strips the module's type annotations on import
  const links = await import(pathToFileURL(linksModule).href)
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

  let protein3dServer
  let protein3dUrl
  if (protein3dDist) {
    if (!fs.existsSync(path.join(protein3dDist, PROTEIN3D_BUNDLE))) {
      throw new Error(
        `no ${PROTEIN3D_BUNDLE} in --protein3d-dist=${protein3dDist}`,
      )
    }
    protein3dServer = await startStaticServer(protein3dPort, protein3dDist)
    protein3dUrl = `http://localhost:${protein3dPort}/${PROTEIN3D_BUNDLE}`
    console.log(`using local protein3d build: ${protein3dDist}`)
  }

  const ctx = {
    configUrl: writeLocalConfig(dataBase, pluginUrl, protein3dUrl),
    dataBase,
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    // jbrowse-web fetches the local config/data cross-origin and needs a webgl
    // context in headless Chrome
    args: [
      ...BROWSER_ARGS,
      '--disable-web-security',
      '--enable-unsafe-swiftshader',
    ],
  })

  const failures = []
  try {
    for (const fig of FIGURES.filter(wants)) {
      // skip a figure whose docs link is no longer in jbrowseLinks.ts
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
    protein3dServer?.close()
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

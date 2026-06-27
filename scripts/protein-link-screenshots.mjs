// End-to-end verification + figure capture for the protein<->genome examples on
// the "Genome browser" docs page (SRC, BRAF, TP53). For each example it runs the
// real generate.mjs, rewrites the data/jbrowse hosts to the local dev servers,
// loads the resulting declarative link in headless JBrowse, ASSERTS the
// connection actually resolves and the highlighted column / codon mapping is
// correct, then screenshots the combined view.
//
// This exercises the exact spec the docs page ships — only the hosts differ, and
// (until the updated combined config is deployed) the TP53 ClinVar track is
// injected as a sessionTrack with the same trackId the spec references.
//
// Requires, all from the webgl-poc work:
//   - jbrowse-web dev server on localhost:3000 (LaunchView-LinearGenomeView id
//     forwarding) built against the published jbrowse-plugin-msaview
//   - a static server for packages/app/public/data on localhost:8090
//   - puppeteer (run from a dir that resolves it, e.g.
//     `cd ~/src/jbrowse-components/products/jbrowse-web && node <this>`)
// Output PNGs -> docs/media/, synced to the website by sync-media.mjs.

import puppeteer from 'puppeteer-core'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome'
const DATA_LOCAL = 'http://localhost:8090'
const JBROWSE_LOCAL = 'http://localhost:3000/'
const GMOD_DATA = 'https://gmod.org/JBrowseMSA/demo/data'
const WEBGL_POC = 'https://jbrowse.org/code/jb2/webgl-poc/'

const EXAMPLES = [
  {
    name: 'src',
    out: 'genome-browser-src.png',
    expectColChar: undefined, // whole-gene link, no pre-highlighted column
  },
  {
    name: 'braf',
    out: 'genome-browser-braf-v600e.png',
    expectColChar: 'V', // V600
  },
  {
    name: 'tp53',
    out: 'genome-browser-tp53-r248.png',
    expectColChar: 'R', // R248
    // the updated combined config (with this track) isn't deployed yet, so shim it
    injectClinvar: true,
  },
]

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--enable-unsafe-swiftshader',
  ],
  defaultViewport: { width: 1600, height: 1135, deviceScaleFactor: 2 },
})

let failures = 0
for (const ex of EXAMPLES) {
  const gen = join(repo, 'scripts', `${ex.name}-protein-link`, 'generate.mjs')
  const realUrl = execFileSync('node', [gen], { encoding: 'utf8' }).trim()
  const u = new URL(realUrl)
  const spec = JSON.parse(
    decodeURIComponent(u.searchParams.get('session').replace(/^spec-/, '')),
  )

  // point data files at the local server; keep the (already-deployed) config so
  // the assembly + RefSeq track resolve
  const retarget = obj => {
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (typeof v === 'string') {
        obj[k] = v.replace(GMOD_DATA, DATA_LOCAL)
      } else if (v && typeof v === 'object') {
        retarget(v)
      }
    }
  }
  retarget(spec)
  if (ex.injectClinvar) {
    spec.sessionTracks = [
      {
        type: 'VariantTrack',
        trackId: 'hg38-tp53-clinvar-pathogenic',
        name: 'ClinVar pathogenic variants (TP53)',
        assemblyNames: ['hg38'],
        adapter: {
          type: 'VcfTabixAdapter',
          vcfGzLocation: { uri: `${DATA_LOCAL}/tp53-clinvar-pathogenic.vcf.gz` },
          index: {
            location: { uri: `${DATA_LOCAL}/tp53-clinvar-pathogenic.vcf.gz.tbi` },
          },
        },
      },
    ]
  }

  const localUrl =
    realUrl
      .slice(0, realUrl.indexOf('?'))
      .replace(WEBGL_POC.replace(/\/$/, ''), JBROWSE_LOCAL.replace(/\/$/, '')) +
    '?config=' +
    encodeURIComponent(u.searchParams.get('config')) +
    '&session=spec-' +
    encodeURIComponent(JSON.stringify(spec))

  const page = await browser.newPage()
  page.on('pageerror', e => console.log(`  [${ex.name} pageerror]`, e.message))
  await page.goto(localUrl, { waitUntil: 'networkidle2', timeout: 120000 })

  // trust the cross-origin plugin once
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
      break
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  await new Promise(r => setTimeout(r, 9000))

  const expectCol = spec.views[1].highlightColumns?.[0]
  const expectCodon = spec.views[0].highlight?.[0]
  const result = await page.evaluate(
    (expectCol, queryName) => {
      const views = window.JBrowseRootModel.session.views
      const msa = views.find(v => v.type === 'MsaView')
      const queryRow = msa.rows.find(r => r[0] === queryName)?.[1]
      const out = {
        connectedResolves: !!msa.connectedView,
        numRows: msa.rows.length,
        highlightedColumns: [...(msa.highlightedColumns || [])],
      }
      if (expectCol !== undefined && queryRow) {
        out.colChar = queryRow[expectCol]
        out.columnAcrossRows = msa.rows.map(r => r[1][expectCol]).join('')
        // click the query residue at the highlighted column -> drive the genome
        const rowIndex = msa.rows.findIndex(r => r[0] === queryName)
        msa.setMouseClickPos(expectCol, rowIndex)
      }
      return out
    },
    expectCol,
    spec.views[1].querySeqName,
  )
  await new Promise(r => setTimeout(r, 2000))
  const lgvLoc = await page.evaluate(() => {
    const lgv = window.JBrowseRootModel.session.views.find(
      v => v.type === 'LinearGenomeView',
    )
    return lgv.coarseVisibleLocStrings || lgv.visibleLocStrings
  })

  // assertions
  const problems = []
  if (!result.connectedResolves) {
    problems.push('connectedView did NOT resolve')
  }
  if (ex.expectColChar && result.colChar !== ex.expectColChar) {
    problems.push(`column char ${result.colChar} != ${ex.expectColChar}`)
  }
  if (expectCol !== undefined && !result.highlightedColumns.includes(expectCol)) {
    problems.push(`highlightedColumns ${result.highlightedColumns} missing ${expectCol}`)
  }

  const outPath = join(repo, 'docs', 'media', ex.out)
  await page.screenshot({ path: outPath })
  const ok = problems.length === 0
  failures += ok ? 0 : 1
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${ex.name}: connected=${result.connectedResolves} ` +
      `col=${result.colChar ?? '-'} (${ex.expectColChar ?? 'n/a'}) ` +
      `column="${result.columnAcrossRows ?? '-'}" lgv=${lgvLoc} -> ${ex.out}` +
      (ok ? '' : `\n  PROBLEMS: ${problems.join('; ')}`),
  )
  if (expectCodon) {
    console.log(`  expected codon highlight: ${expectCodon}`)
  }
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)

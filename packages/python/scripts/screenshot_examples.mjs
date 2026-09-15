// Render msaview/static/widget.js with the traits run_examples.py captured and
// write images/<notebook>.png. The page loads the bundle from a blob URL, as
// anywidget does, and hands it a model holding those traits.
//
//   node scripts/screenshot_examples.mjs
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer-core'

import { BROWSER_ARGS, findChrome } from '../../../scripts/screenshots/lib.mjs'

const PACKAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const harness = `<!doctype html><html><head><meta charset="utf8">
<style>body{margin:0;font-family:sans-serif}#root{width:960px;padding:8px}</style>
</head><body><div id="root"></div>
<script type="module">
const esm = await (await fetch('/msaview/static/widget.js')).text()
const url = URL.createObjectURL(new Blob([esm], { type: 'text/javascript' }))
const widget = (await import(url)).default
const store = { ...window.__traits }
const model = {
  get: k => store[k],
  set: (k, v) => { store[k] = v },
  save_changes: () => {},
  on: () => {},
  off: () => {},
}
widget.render({ model, el: document.getElementById('root') })
</script></body></html>`

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')
  if (pathname === '/') {
    res.setHeader('content-type', 'text/html')
    res.end(harness)
    return
  }
  try {
    res.setHeader('content-type', 'text/javascript')
    res.end(await readFile(path.join(PACKAGE, pathname)))
  } catch {
    res.statusCode = 404
    res.end()
  }
})
await new Promise(resolve => server.listen(0, resolve))

const specs = JSON.parse(
  await readFile(path.join(PACKAGE, 'scripts/screenshot_specs.json'), 'utf8'),
)
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  args: BROWSER_ARGS,
  defaultViewport: { width: 976, height: 700, deviceScaleFactor: 2 },
})
let failed = 0
for (const [name, traits] of Object.entries(specs)) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.evaluateOnNewDocument(t => {
    window.__traits = t
  }, traits)
  await page.goto(`http://localhost:${server.address().port}/`)
  try {
    await page.waitForSelector('[data-testid="msa_canvas"] canvas', {
      timeout: 30000,
    })
    await new Promise(resolve => setTimeout(resolve, 1500))
    const file = path.join(PACKAGE, 'images', `${name}.png`)
    await (await page.$('#root')).screenshot({ path: file })
    console.log(`wrote images/${name}.png`)
  } catch (e) {
    failed++
    console.error(`${name}: ${e.message}`, errors)
  }
  await page.close()
}
await browser.close()
server.close()
process.exit(failed ? 1 : 0)

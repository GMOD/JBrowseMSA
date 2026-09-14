#!/usr/bin/env node
/**
 * Install the packed packages the way a reader of the docs would (plain npm,
 * outside this workspace, no pnpm overrides) and check that the result runs:
 *
 *   1. the README/USAGE quick start in a Vite app, rendered in headless Chrome
 *   2. `react-msaview-cli --help` and `export-svg` from a global-style install
 *
 * Both were broken on npm while CI was green, because everything CI builds
 * resolves through the workspace: one hoisted mobx, and @jbrowse/core coming
 * from vendor-jbrowse/ rather than the registry. The published tree is a
 * different tree, and this is the only job that installs it.
 *
 * The quick start pins the majors @jbrowse/core depends on. That pinning is the
 * point of the test: install `@mui/material` (9) next to core 4 and the viewer
 * throws on a theme from the other copy, and let npm auto-install the mobx peer
 * and it picks 7 against core's 6 and the model dies with "Identifier types can
 * only be instantiated as direct child of a model type". Keep this list and the
 * one in USAGE.md identical.
 *
 * Run it after a build: `pnpm build && node scripts/npm-smoke.mjs`.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import puppeteer from 'puppeteer-core'

import { pack, publishablePackages } from './check-pack.mjs'
import {
  BROWSER_ARGS,
  delay,
  findChrome,
  startStaticServer,
} from './screenshots/lib.mjs'

// the versions @jbrowse/core 4.x depends on; see USAGE.md
const QUICK_START_DEPS = [
  '@jbrowse/core@4',
  'mobx@6',
  'mobx-react@9',
  '@jbrowse/mobx-state-tree@5',
  '@mui/material@7',
  '@mui/icons-material@7',
  '@emotion/react',
  '@emotion/styled',
  'react',
  'react-dom',
]

const APP = 'src/App.tsx'
const APP_SOURCE = `import { MSAViewer } from 'react-msaview'

export default function App() {
  return (
    <MSAViewer
      msa={\`>human\\nMKAANSE\\n>mouse\\nMKA-NSE\`}
      tree="(human:0.1,mouse:0.2);"
      colorScheme="clustal"
    />
  )
}
`

const MAIN_SOURCE = `import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)
`

const INDEX_HTML = `<!doctype html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`

const FASTA =
  '>human\nMKAANSEQRLLW\n>mouse\nMKA-NSEQRLIW\n>fish\nMRAANTEQ-LLW\n'
const NEWICK = '(human:0.1,(mouse:0.2,fish:0.5):0.1);\n'

const npm = (cwd, ...args) =>
  execFileSync('npm', [...args, '--no-audit', '--no-fund'], {
    cwd,
    stdio: 'inherit',
  })

const write = (dir, file, content) => {
  fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true })
  fs.writeFileSync(path.join(dir, file), content)
}

function packAll(outDir) {
  const tarballs = {}
  for (const dir of publishablePackages()) {
    const name = JSON.parse(
      fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
    ).name
    tarballs[name] = pack(dir, outDir)
  }
  return tarballs
}

async function renderQuickStart(dir) {
  const server = await startStaticServer(0, path.join(dir, 'dist'))
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    args: BROWSER_ARGS,
    defaultViewport: { width: 1000, height: 600 },
  })
  const errors = []
  try {
    const page = await browser.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`http://localhost:${server.address().port}/`, {
      waitUntil: 'networkidle0',
    })
    await delay(2000)
    const drawn = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      text: document.body.innerText,
    }))
    if (errors.length > 0) {
      throw new Error(`quick start threw: ${errors.join('; ')}`)
    }
    if (drawn.canvases === 0 || !drawn.text.includes('Conservation')) {
      throw new Error(
        `quick start rendered blank (${drawn.canvases} canvases, text ${JSON.stringify(drawn.text.slice(0, 120))})`,
      )
    }
    console.log(`quick start rendered ${drawn.canvases} canvases`)
  } finally {
    await browser.close()
    server.close()
  }
}

async function checkQuickStart(workDir, tarballs) {
  const dir = path.join(workDir, 'quickstart')
  fs.mkdirSync(dir)
  write(
    dir,
    'package.json',
    '{"name":"smoke","private":true,"type":"module"}\n',
  )
  write(dir, 'index.html', INDEX_HTML)
  write(dir, 'src/main.jsx', MAIN_SOURCE)
  write(dir, APP, APP_SOURCE)
  write(
    dir,
    'vite.config.js',
    "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({ plugins: [react()] })\n",
  )

  npm(
    dir,
    'install',
    'vite',
    '@vitejs/plugin-react',
    tarballs['@jbrowse/svgcanvas'],
    tarballs['msa-parsers'],
    tarballs['react-msaview'],
    ...QUICK_START_DEPS,
  )
  execFileSync('npx', ['vite', 'build'], { cwd: dir, stdio: 'inherit' })
  await renderQuickStart(dir)
}

function checkCli(workDir, tarballs) {
  const dir = path.join(workDir, 'cli')
  fs.mkdirSync(dir)
  write(dir, 'package.json', '{"name":"smoke-cli","private":true}\n')
  write(dir, 'aln.fa', FASTA)
  write(dir, 'tree.nwk', NEWICK)

  npm(dir, 'install', tarballs['react-msaview-cli'])
  const bin = path.join(dir, 'node_modules/.bin/react-msaview-cli')
  const help = execFileSync(bin, ['--help'], { encoding: 'utf8' })
  if (!help.includes('export-svg')) {
    throw new Error(`--help did not list the commands:\n${help}`)
  }
  execFileSync(
    bin,
    ['export-svg', '--msa', 'aln.fa', '--tree', 'tree.nwk', '-o', 'out.svg'],
    { cwd: dir, stdio: 'inherit' },
  )
  const svg = fs.readFileSync(path.join(dir, 'out.svg'), 'utf8')
  if (!svg.startsWith('<svg') || !svg.includes('human')) {
    throw new Error(`export-svg wrote no usable SVG (${svg.length} bytes)`)
  }
  console.log(`cli export-svg wrote ${svg.length} bytes`)
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-smoke-'))
try {
  const tgzDir = path.join(workDir, 'tgz')
  fs.mkdirSync(tgzDir)
  const tarballs = packAll(tgzDir)
  await checkQuickStart(workDir, tarballs)
  checkCli(workDir, tarballs)
  console.log('\nnpm smoke passed')
} finally {
  fs.rmSync(workDir, { recursive: true, force: true })
}

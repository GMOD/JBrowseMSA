/**
 * One command to regenerate every figure in the docs. Runs three phases:
 *
 *   figures  — the README/SVG figures, via the viewer's own SVG export under
 *              jsdom (no browser).            -> packages/lib/scripts/generateFigures.tsx
 *   app      — the demo-app PNG screenshots (color schemes, dialogs, the curated
 *              phylogeny gallery), via puppeteer against a built app.
 *                                              -> scripts/screenshots/generate.mjs
 *   jbrowse  — the genome-browser figures, via the react-msaview plugin
 *              running inside a real jbrowse-web (needs the webgl-poc build).
 *                                              -> scripts/screenshots/jbrowse-figures.mjs
 *
 * Each phase writes into docs/media and self-gates: a re-render only overwrites a
 * committed PNG when its pixels actually changed (see image-pipeline.mjs), so a
 * full regen leaves byte-identical figures untouched.
 *
 * Usage:
 *   pnpm screenshots:all                       all three phases
 *   pnpm screenshots:all --only=app,jbrowse    a subset of phases
 *   pnpm screenshots:all --only=jbrowse --filter=braf
 *   pnpm screenshots:all --force               rewrite every figure
 *   pnpm screenshots:all --skip-build          reuse the existing app build
 *   pnpm screenshots:all --jbrowse-url=http://localhost:3000
 *
 * The jbrowse phase needs a running jbrowse-web (webgl-poc branch). If it isn't
 * reachable that phase is skipped with a note, not failed, so the self-contained
 * figures still regenerate on a machine without the jbrowse checkout.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { flag, listOpt, opt } from './lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

const force = flag('force')
const skipBuild = flag('skip-build')
const filter = opt('filter', '')
const jbrowseUrl = opt('jbrowse-url', '')
const pluginDist = opt('plugin-dist', '')
const protein3dDist = opt('protein3d-dist', '')
const only = listOpt('only')

const ALL_PHASES = ['figures', 'app', 'jbrowse']
const phases = only.length > 0 ? only : ALL_PHASES
const wants = name => phases.includes(name)

// pass-through flags shared by the puppeteer phases
const passthrough = [force && '--force', filter && `--filter=${filter}`].filter(
  Boolean,
)

function run(cmd, cmdArgs, { cwd = repoRoot } = {}) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`)
  return spawnSync(cmd, cmdArgs, { cwd, stdio: 'inherit' }).status ?? 1
}

const results = {}

if (wants('figures')) {
  console.log('\n=== figures (SVG, jsdom) ===')
  results.figures = run('pnpm', ['figures'])
}

if (wants('app')) {
  console.log('\n=== app screenshots (puppeteer) ===')
  let status = run('node', ['scripts/screenshots/writeExampleData.mjs'])
  if (status === 0 && !skipBuild) {
    status = run('pnpm', ['--filter', 'app', 'exec', 'vite', 'build'])
  }
  if (status === 0) {
    status = run('node', ['scripts/screenshots/generate.mjs', ...passthrough])
  }
  results.app = status
}

if (wants('jbrowse')) {
  console.log('\n=== jbrowse-integration figures (puppeteer + jbrowse-web) ===')
  const jbArgs = [
    'scripts/screenshots/jbrowse-figures.mjs',
    ...passthrough,
    jbrowseUrl && `--jbrowse-url=${jbrowseUrl}`,
    pluginDist && `--plugin-dist=${pluginDist}`,
    protein3dDist && `--protein3d-dist=${protein3dDist}`,
  ].filter(Boolean)
  const status = run('node', jbArgs)
  // exit 2 from the phase means "jbrowse-web not reachable" -> skip, don't fail
  results.jbrowse = status === 2 ? 'skipped' : status
}

console.log('\n=== summary ===')
let failed = false
for (const phase of phases) {
  const r = results[phase]
  const label =
    r === 'skipped' ? 'SKIPPED' : r === 0 ? 'ok' : `FAILED (exit ${r})`
  if (r !== 0 && r !== 'skipped') {
    failed = true
  }
  console.log(`  ${phase}: ${label}`)
}
process.exit(failed ? 1 : 0)

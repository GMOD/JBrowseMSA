/**
 * Assemble the GitHub Pages bundle for gmod.org/JBrowseMSA:
 *   pages-dist/        -> the docs website  (gmod.org/JBrowseMSA)
 *   pages-dist/demo/   -> the demo app      (gmod.org/JBrowseMSA/demo)
 *
 * Run after building the website (packages/website/dist) and the app
 * (packages/app/dist). `pnpm build:pages` does both then calls this.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const websiteDist = path.join(repoRoot, 'packages', 'website', 'dist')
const appDist = path.join(repoRoot, 'packages', 'app', 'dist')
const out = path.join(repoRoot, 'pages-dist')

for (const [label, dir] of [
  ['website', websiteDist],
  ['app', appDist],
]) {
  if (!fs.existsSync(dir)) {
    console.error(`Missing ${label} build at ${dir} — run pnpm build:pages`)
    process.exit(1)
  }
}

fs.rmSync(out, { recursive: true, force: true })
fs.cpSync(websiteDist, out, { recursive: true })
fs.cpSync(appDist, path.join(out, 'demo'), { recursive: true })

// GitHub Pages runs Jekyll by default, which strips Astro's _astro/ dir;
// .nojekyll disables that.
fs.writeFileSync(path.join(out, '.nojekyll'), '')

console.log('assembled pages-dist (docs at /, app at /demo)')

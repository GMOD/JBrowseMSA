/**
 * Write the larger real-data examples out as standalone files the demo app can
 * fetch, instead of inlining them into a `?data=` URL. A loaded-state deep-link
 * otherwise has to carry the whole alignment in the query string (the lysine
 * Stockholm alone is ~26 KB); pointing a *Filehandle prop at a hosted file keeps
 * those links a few hundred bytes.
 *
 * Single source of truth is the examples package's TS constants — this reads the
 * file and pulls the constants out by name (no TS loader needed), so the hosted
 * files never drift from the in-app examples. Output is served from the app
 * (packages/app/public -> dist root -> gmod.org/JBrowseMSA/demo/data/...).
 *
 * Run standalone with:  node scripts/screenshots/writeExampleData.mjs
 * (also runs automatically as the first step of `pnpm screenshots`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const exampleData = fs.readFileSync(
  path.join(repoRoot, 'packages/examples/src/examples/exampleData.ts'),
  'utf8',
)
const outDir = path.join(repoRoot, 'packages/app/public/data')

function backtickConst(name) {
  const m = exampleData.match(
    new RegExp(`export const ${name} = \`([\\s\\S]*?)\``),
  )
  if (!m) {
    throw new Error(`could not find ${name} in exampleData.ts`)
  }
  return m[1]
}
function quotedConst(name) {
  const m = exampleData.match(new RegExp(`export const ${name} =\\s*'([^']*)'`))
  if (!m) {
    throw new Error(`could not find ${name} in exampleData.ts`)
  }
  return m[1]
}

// format is detected from content (CLUSTAL/# STOCKHOLM/>/##gff headers), so the
// extensions here are only for human readability
const files = {
  'kinase.aln': backtickConst('kinaseMSA'),
  'kinase.nh': quotedConst('kinaseTree'),
  'kinase-domains.gff': backtickConst('kinaseDomainsGFF'),
  'lysine.stock': backtickConst('lysineMSA'),
}

fs.mkdirSync(outDir, { recursive: true })
for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, file), content)
  console.log(`wrote data/${file} (${content.length} bytes)`)
}

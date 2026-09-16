/**
 * Fails when a hosted data file a page links has gone missing, or when the
 * provenance table in packages/app/public/data/README.md no longer matches the
 * directories beside it.
 *
 *   node scripts/check-data-refs.mjs
 *
 * `pnpm check:media` watches the figures; nothing watched the data under them.
 * A tutorial's `?data=` links carry `data/<topic>/<file>` rather than the file
 * itself, so renaming or deleting one leaves the page building, the committed
 * PNG unchanged and the live link 404ing, with nothing to notice. The figure is
 * a picture of a view the reader can no longer open.
 *
 * The provenance half is the same rot one level up. The table lists a folder,
 * the tutorial it backs and the script that writes it, which is what tells a
 * reader which commands reproduce a committed alignment. Six folders were
 * missing from it by the time this check was written.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const publicDir = path.join(repoRoot, 'packages', 'app', 'public')
const dataDir = path.join(publicDir, 'data')
const dataReadme = path.join(dataDir, 'README.md')

// Where a ?data= link can appear.
const LINK_DIRS = ['docs', 'website/src']
const LINK_EXT = new Set(['.md', '.astro', '.ts', '.tsx'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro'])

function walk(rel, out = []) {
  const abs = path.join(repoRoot, rel)
  if (!fs.existsSync(abs)) {
    return out
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const next = path.join(rel, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(next, out)
      }
    } else if (LINK_EXT.has(path.extname(entry.name))) {
      out.push(next)
    }
  }
  return out
}

const problems = []

// 1. every hosted file a ?data= link names exists. The snapshot is percent
// encoded in the href, so decode it and read the *Filehandle uris out of the
// parsed JSON rather than pattern-matching the encoded text.
let linkCount = 0
for (const rel of LINK_DIRS.flatMap(dir => walk(dir))) {
  const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8')
  for (const match of text.matchAll(/\?data=([^\s)>'"`]+)/g)) {
    let snap
    try {
      snap = JSON.parse(decodeURIComponent(match[1]))
    } catch {
      continue
    }
    for (const [key, value] of Object.entries(snap.msaview ?? {})) {
      const uri = key.endsWith('Filehandle') ? value?.uri : undefined
      if (typeof uri !== 'string' || /^[a-z]+:\/\//.test(uri)) {
        continue
      }
      linkCount += 1
      if (!fs.existsSync(path.join(publicDir, uri))) {
        problems.push(
          `${rel}: a ?data= link loads ${uri}, which is not in packages/app/public`,
        )
      }
    }
  }
}

// 2. the provenance table lists every tutorial data folder, and each row's
// tutorials and build scripts exist. A row is
// | `tem/` | [tem_alleles](../../../../docs/tutorials/tem_alleles.md) | `docs/tutorials/scripts/build_tem_alleles.sh` |
// and a folder that two pages or two scripts share names them all in its cell.
const readme = fs.readFileSync(dataReadme, 'utf8')
const rows = new Map()
for (const line of readme.split('\n')) {
  const cells = line.split('|').slice(1, -1)
  const folder = cells[0]?.trim().match(/^`([^`/]+)\/`$/)?.[1]
  if (cells.length < 3 || !folder) {
    continue
  }
  rows.set(folder, {
    tutorials: [...cells[1].matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]),
    scripts: [...cells[2].matchAll(/`([^`]+)`/g)].map(m => m[1]),
  })
}

const folders = fs
  .readdirSync(dataDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

for (const folder of folders) {
  if (!rows.has(folder)) {
    problems.push(
      `packages/app/public/data/${folder}/ has no row in the provenance table of data/README.md`,
    )
  }
}
for (const [folder, { tutorials, scripts }] of rows) {
  if (!folders.includes(folder)) {
    problems.push(
      `data/README.md lists ${folder}/, which no longer exists under packages/app/public/data`,
    )
  }
  if (tutorials.length === 0 || scripts.length === 0) {
    problems.push(
      `data/README.md: ${folder}/ names no tutorial or no build script`,
    )
  }
  for (const tutorial of tutorials) {
    if (!fs.existsSync(path.resolve(dataDir, tutorial))) {
      problems.push(
        `data/README.md: ${folder}/ names ${tutorial}, which does not exist`,
      )
    }
  }
  for (const script of scripts) {
    if (!fs.existsSync(path.join(repoRoot, script))) {
      problems.push(
        `data/README.md: ${folder}/ is built by ${script}, which does not exist`,
      )
    }
  }
}

// 3. each folder's own README names every file in it, which is the row that
// says what wrote the file and which step of the page it belongs to
let fileCount = 0
for (const folder of folders) {
  const folderReadme = path.join(dataDir, folder, 'README.md')
  if (!fs.existsSync(folderReadme)) {
    problems.push(`packages/app/public/data/${folder}/ has no README.md`)
    continue
  }
  const text = fs.readFileSync(folderReadme, 'utf8')
  for (const file of fs.readdirSync(path.join(dataDir, folder)).sort()) {
    if (file === 'README.md') {
      continue
    }
    fileCount += 1
    if (!text.includes(file)) {
      problems.push(
        `packages/app/public/data/${folder}/README.md does not name ${file}`,
      )
    }
  }
}

// one missing file is named by every link that loads it, and a page links the
// same alignment from most of its figures
const unique = [...new Set(problems)].sort()
if (unique.length > 0) {
  console.error(
    `${unique.length} problem(s) with the hosted data:\n` +
      unique.map(p => `  ${p}`).join('\n'),
  )
  process.exit(1)
}

console.log(
  `hosted data: ${linkCount} ?data= file references resolve, ` +
    `${folders.length} folders in the provenance table, ` +
    `${fileCount} files named by their folder README`,
)

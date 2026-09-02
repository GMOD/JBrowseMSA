#!/usr/bin/env node
/**
 * Monorepo release script - bumps all package versions, pushes
 * Usage: node scripts/release.js [patch|minor|major]
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const bumpType = process.argv[2] || 'patch'

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/release.js [patch|minor|major]')
  process.exit(1)
}

const run = (cmd, cwd = rootDir) => {
  console.log(`\n$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd })
}

const capture = cmd => execSync(cmd, { cwd: rootDir }).toString().trim()

// Preflight: release only from a clean main checkout
const branch = capture('git rev-parse --abbrev-ref HEAD')
if (branch !== 'main') {
  console.error(`Must be on main to release (currently on ${branch})`)
  process.exit(1)
}
if (capture('git status --porcelain')) {
  console.error('Working tree is dirty; commit or clean it before releasing')
  process.exit(1)
}
run('git fetch origin main')
const localHead = capture('git rev-parse HEAD')
const remoteHead = capture('git rev-parse origin/main')
if (localHead !== remoteHead) {
  const ahead = Number(capture('git rev-list --count origin/main..HEAD'))
  const behind = Number(capture('git rev-list --count HEAD..origin/main'))
  console.error(
    behind
      ? `main is ${behind} commit(s) behind origin/main; pull before releasing`
      : `main is ${ahead} commit(s) ahead of origin/main; push before releasing`,
  )
  process.exit(1)
}

// Packages to publish (in dependency order)
const packages = ['svgcanvas', 'msa-parsers', 'lib', 'cli']

// Read current version from lib (the main package)
const libPkgPath = path.join(rootDir, 'packages/lib/package.json')
const libPkg = JSON.parse(fs.readFileSync(libPkgPath, 'utf8'))
const oldVersion = libPkg.version

// Calculate new version
const [major, minor, patch] = oldVersion.split('.').map(Number)
let newVersion
if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`
} else {
  newVersion = `${major}.${minor}.${patch + 1}`
}

console.log(`\nReleasing: ${oldVersion} → ${newVersion}\n`)

// Update version in all packages
for (const pkg of packages) {
  const pkgPath = path.join(rootDir, 'packages', pkg, 'package.json')
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkgJson.version = newVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n')
  console.log(`Updated packages/${pkg}/package.json`)
}

// Update src/version.ts in lib
const versionTsPath = path.join(rootDir, 'packages/lib/src/version.ts')
fs.writeFileSync(versionTsPath, `export const version = '${newVersion}'\n`)
console.log('Updated packages/lib/src/version.ts')

// Build before tagging so a broken build never gets a release tag pushed
console.log('\nBuilding all packages...')
run('pnpm build')

// The R package vendors the UMD bundle (R installs run no node), so refresh it
// from the build we just made -- otherwise msaviewr ships whatever JavaScript
// was current the last time someone remembered to copy it across
console.log('\nSyncing the R package bundle...')
run('node scripts/sync-r-bundle.mjs')

// Commit the version bump, tag, and push. The pushed tag triggers publish.yml
// (npm), and the push to main triggers deploy-docs.yml (GitHub Pages).
const tag = `v${newVersion}`
console.log(`\nCreating git tag ${tag}...`)
const changed = [
  ...packages.map(pkg => `packages/${pkg}/package.json`),
  'packages/lib/src/version.ts',
  'packages/r-msaview/inst/htmlwidgets/lib/react-msaview.umd.js',
  'packages/r-msaview/inst/htmlwidgets/msaview.yaml',
].join(' ')
run(`git add ${changed}`)
run(`git commit -m "${tag}"`)
run(`git tag -a "${tag}" -m "${tag}"`)
run('git push && git push --tags')

console.log(`\n✓ Released ${tag} — CI will publish to npm and deploy the site`)

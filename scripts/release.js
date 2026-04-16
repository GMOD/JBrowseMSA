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

// Build all packages
console.log('\nBuilding all packages...')

// Git operations
const tag = `v${newVersion}`
console.log(`\nCreating git tag ${tag}...`)
run('git add -A')
run(`git commit -m "${tag}"`)
run(`git tag -a "${tag}" -m "${tag}"`)
run('git push && git push --tags')

// Deploy app to GitHub Pages
console.log('\nDeploying app to GitHub Pages...')
run('pnpm run deploy', path.join(rootDir, 'packages/app'))

console.log(`\n✓ Released ${tag} — GitHub Actions will publish to npm`)

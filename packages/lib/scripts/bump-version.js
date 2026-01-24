#!/usr/bin/env node
/**
 * Bumps the patch version in package.json and updates src/version.ts
 * Usage: node scripts/bump-version.js [patch|minor|major]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const bumpType = process.argv[2] || 'patch'

// Read package.json
const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

// Parse and bump version
const [major, minor, patch] = pkg.version.split('.').map(Number)
let newVersion
if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`
} else {
  newVersion = `${major}.${minor}.${patch + 1}`
}

// Update package.json
pkg.version = newVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// Update src/version.ts
const versionTsPath = path.join(rootDir, 'src', 'version.ts')
fs.writeFileSync(versionTsPath, `export const version = '${newVersion}'\n`)

console.log(`Bumped version: ${pkg.version.replace(newVersion, '')}${major}.${minor}.${patch} → ${newVersion}`)

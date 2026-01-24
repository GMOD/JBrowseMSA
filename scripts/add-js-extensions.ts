#!/usr/bin/env node --experimental-strip-types
/**
 * Script to convert .js extensions to .ts extensions in imports.
 * TSC will rewrite them appropriately when compiling.
 * Run with: node --experimental-strip-types scripts/add-js-extensions.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, extname, dirname } from 'path'

const targetDir = process.argv[2] || 'lib/src'

function getTsExtension(importPath: string, fromFile: string): string {
  const baseDir = dirname(fromFile)
  // Check if .tsx exists, otherwise assume .ts
  const fullPathTsx = join(baseDir, importPath + '.tsx')
  const fullPathTs = join(baseDir, importPath + '.ts')

  if (existsSync(fullPathTsx)) {
    return '.tsx'
  }
  return '.ts'
}

function processFile(filePath: string) {
  const ext = extname(filePath)
  if (ext !== '.ts' && ext !== '.tsx') {
    return
  }

  const content = readFileSync(filePath, 'utf8')

  // Convert .js extensions back to .ts/.tsx
  const importRegex = /((?:import|export)(?:\s+type)?(?:[^'"]*)?from\s+['"])(\.[^'"]+)\.js(['"])/g

  let modified = content.replace(importRegex, (match, prefix, path, suffix) => {
    const tsExt = getTsExtension(path, filePath)
    return `${prefix}${path}${tsExt}${suffix}`
  })

  // Also handle dynamic imports: import('./path.js')
  const dynamicImportRegex = /(import\s*\(\s*['"])(\.[^'"]+)\.js(['"]\s*\))/g
  modified = modified.replace(dynamicImportRegex, (match, prefix, path, suffix) => {
    const tsExt = getTsExtension(path, filePath)
    return `${prefix}${path}${tsExt}${suffix}`
  })

  if (modified !== content) {
    writeFileSync(filePath, modified)
    console.log(`Updated: ${filePath}`)
  }
}

function walkDir(dir: string) {
  const files = readdirSync(dir)
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walkDir(filePath)
      }
    } else {
      processFile(filePath)
    }
  }
}

console.log(`Converting .js to .ts/.tsx extensions in imports in ${targetDir}...`)
walkDir(targetDir)
console.log('Done!')

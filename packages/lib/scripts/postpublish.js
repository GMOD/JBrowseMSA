#!/usr/bin/env node
/**
 * Post-publish script: commits version changes, creates tag, and pushes
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`

const run = cmd => {
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: rootDir })
}

try {
  run('git add -A')
  run(`git commit -m "${tag}"`)
  run(`git tag -a "${tag}" -m "${tag}"`)
  run('git push --follow-tags')
  console.log(`\nSuccessfully published ${tag}`)
} catch (error) {
  console.error('Post-publish failed:', error.message)
  process.exit(1)
}

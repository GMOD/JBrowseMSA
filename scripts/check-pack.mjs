#!/usr/bin/env node
/**
 * Pack every publishable package and assert the tarball contains what its
 * manifest points at: bin, main, types and every exports target.
 *
 * react-msaview-cli 6.3.0 through 6.5.0 went to npm with three files and no
 * dist, because the root `build` script (which publish.yml runs) built three
 * packages and CI built the CLI in a step of its own. Nothing compared the
 * manifest against the bytes, so `npm i -g react-msaview-cli` installed a
 * package whose bin did not exist. This is that comparison.
 *
 * Run it after a build: `pnpm build && node scripts/check-pack.mjs`.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** every string leaf of an exports map, plus main/types/bin */
function entryTargets(pkg) {
  const targets = []
  const walk = node => {
    if (typeof node === 'string') {
      targets.push(node)
    } else if (node && typeof node === 'object') {
      for (const value of Object.values(node)) {
        walk(value)
      }
    }
  }
  walk(pkg.exports)
  walk(pkg.bin)
  for (const field of ['main', 'module', 'types', 'typings']) {
    if (pkg[field]) {
      targets.push(pkg[field])
    }
  }
  return [...new Set(targets)]
}

function packedFiles(tarball) {
  return execFileSync('tar', ['tzf', tarball], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map(name => name.replace(/^package\//, ''))
}

function packedManifest(tarball) {
  return JSON.parse(
    execFileSync('tar', ['xzOf', tarball, 'package/package.json'], {
      encoding: 'utf8',
    }),
  )
}

/** the publishable workspace packages, as absolute directories */
export function publishablePackages() {
  return fs
    .readdirSync(path.join(rootDir, 'packages'))
    .map(dir => path.join(rootDir, 'packages', dir))
    .filter(dir => fs.existsSync(path.join(dir, 'package.json')))
    .filter(
      dir =>
        !JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
          .private,
    )
}

/** pack one package into outDir and return the tarball path */
export function pack(dir, outDir) {
  const before = new Set(fs.readdirSync(outDir))
  execFileSync('pnpm', ['pack', '--pack-destination', outDir], {
    cwd: dir,
    stdio: 'pipe',
  })
  const made = fs
    .readdirSync(outDir)
    .find(f => f.endsWith('.tgz') && !before.has(f))
  return path.join(outDir, made)
}

function check() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-pack-'))
  const problems = []

  try {
    for (const dir of publishablePackages()) {
      const tarball = pack(dir, outDir)
      const pkg = packedManifest(tarball)
      const files = new Set(packedFiles(tarball))
      const missing = entryTargets(pkg)
        .map(target => target.replace(/^\.\//, ''))
        .filter(target => !files.has(target))

      console.log(
        `${pkg.name}@${pkg.version}: ${files.size} files, ${missing.length ? 'MISSING' : 'ok'}`,
      )
      for (const target of missing) {
        problems.push(`${pkg.name}: manifest points at ${target}, not packed`)
      }
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }

  if (problems.length > 0) {
    console.error(`\n${problems.join('\n')}`)
    console.error('\nRun `pnpm build` first; if it is built, check "files"')
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  check()
}

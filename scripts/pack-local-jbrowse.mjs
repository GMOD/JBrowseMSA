// Local stopgap: pack @jbrowse/core + @jbrowse/render-core from a local
// jbrowse-components checkout into ./vendor-jbrowse, rewriting the dev `exports`
// map (which points at ./src/*.ts) to the esm build the same way `npm publish`
// applies publishConfig.exports. This lets react-msaview consume a MUI-v9
// jbrowse-core before it is published to npm.
//
// Usage: node scripts/pack-local-jbrowse.mjs [path-to-jbrowse-components]
//   defaults to ~/src/jbrowse-components
//
// Remove ./vendor-jbrowse and the pnpm-workspace.yaml overrides once a
// MUI-v9-compatible @jbrowse/core is published to npm.
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jbrowseRoot = resolve(
  process.argv[2] ?? join(homedir(), 'src/jbrowse-components'),
)
const outDir = join(repoRoot, 'vendor-jbrowse')

const packages = [
  { name: 'jbrowse-core', dir: join(jbrowseRoot, 'packages/core') },
  { name: 'jbrowse-render-core', dir: join(jbrowseRoot, 'packages/render-core') },
]

function esmFromSrc(srcPath) {
  const base = srcPath.replace(/^\.\/src\//, '').replace(/\.(tsx?|js)$/, '')
  return { types: `./esm/${base}.d.ts`, import: `./esm/${base}.js` }
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

for (const { name, dir } of packages) {
  if (!existsSync(dir)) {
    throw new Error(`missing ${dir} — pass your jbrowse-components path as arg 1`)
  }
  // prepack runs the esm build
  execSync(`npm pack --pack-destination ${outDir}`, { cwd: dir, stdio: 'inherit' })

  const work = join(outDir, `unpack-${name}`)
  mkdirSync(work, { recursive: true })
  execSync(`tar xzf ${name}-4.3.0.tgz -C ${work}`, { cwd: outDir })

  const pkgPath = join(work, 'package/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const rewritten = {}
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    rewritten[key] =
      typeof value === 'string' && value.startsWith('./src/')
        ? esmFromSrc(value)
        : value
  }
  pkg.exports = rewritten
  delete pkg.publishConfig?.exports
  delete pkg.publishConfig?.typesVersions
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  execSync(`tar czf ${join(outDir, `${name}.tgz`)} package`, { cwd: work })
  rmSync(work, { recursive: true, force: true })
  rmSync(join(outDir, `${name}-4.3.0.tgz`), { force: true })
  console.log(`packed ${name} -> vendor-jbrowse/${name}.tgz`)
}

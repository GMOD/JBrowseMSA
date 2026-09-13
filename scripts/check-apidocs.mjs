/**
 * Fail when packages/lib/apidocs is not what the generator produces today.
 *
 * The model docs are generated from the `#property`/`#getter`/`#action` tags in
 * packages/lib/src/model.ts, and nothing made anyone re-run the generator, so
 * the published API reference silently lost every member added after the last
 * run. This regenerates into the working tree, compares, and puts the committed
 * files back, so the check leaves no diff behind either way.
 *
 * Run it as `node scripts/check-apidocs.mjs`.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(repoRoot, 'packages/lib/apidocs')

const read = () =>
  Object.fromEntries(
    fs
      .readdirSync(dir)
      .filter(file => file.endsWith('.md') && file !== 'CLAUDE.md')
      .map(file => [file, fs.readFileSync(path.join(dir, file), 'utf8')]),
  )

const committed = read()

execFileSync('pnpm', ['--filter', 'react-msaview', 'statedocs'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

const generated = read()

for (const file of new Set([...Object.keys(committed), ...Object.keys(generated)])) {
  fs.rmSync(path.join(dir, file), { force: true })
}
for (const [file, content] of Object.entries(committed)) {
  fs.writeFileSync(path.join(dir, file), content)
}

const stale = [...new Set([...Object.keys(committed), ...Object.keys(generated)])]
  .filter(file => committed[file] !== generated[file])
  .sort()

if (stale.length > 0) {
  console.error(
    `apidocs are stale: ${stale.join(', ')}\n` +
      'Run `pnpm --filter react-msaview statedocs` and commit the result.',
  )
  process.exit(1)
}
console.log('apidocs are up to date')

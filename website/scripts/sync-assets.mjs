// Copy the repo's static assets into the site's public/ so the website serves
// them: docs/media as /JBrowseMSA/media/* (the docs figures and screenshots)
// and the root favicon.svg as /JBrowseMSA/favicon.svg.
//
// It writes over the existing files and unlinks the ones that went away,
// keeping the directory itself. Deleting and recreating public/media instead
// leaves a dev server that is already running to 404 every figure until it
// restarts, since its static handler holds the directory it read at boot.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const publicDir = path.resolve(__dirname, '..', 'public')

function syncDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`sync-assets: source dir not found: ${src}`)
  }
  fs.mkdirSync(dest, { recursive: true })
  const files = fs.readdirSync(src)
  for (const stale of fs.readdirSync(dest)) {
    if (!files.includes(stale)) {
      fs.rmSync(path.join(dest, stale), { recursive: true, force: true })
    }
  }
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file))
  }
  return files.length
}

const count = syncDir(
  path.join(repoRoot, 'docs', 'media'),
  path.join(publicDir, 'media'),
)
fs.copyFileSync(
  path.join(repoRoot, 'favicon.svg'),
  path.join(publicDir, 'favicon.svg'),
)
console.log(`synced ${count} files to public/media, and favicon.svg`)

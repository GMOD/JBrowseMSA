// Copy the repo's docs/media into the site's public/media so the docs figures
// and screenshots are served by the website (referenced as /JBrowseMSA/media/*).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(__dirname, '..', '..', '..', 'docs', 'media')
const dest = path.resolve(__dirname, '..', 'public', 'media')

fs.rmSync(dest, { recursive: true, force: true })
fs.mkdirSync(dest, { recursive: true })
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file))
}
console.log(`synced ${fs.readdirSync(dest).length} files to public/media`)

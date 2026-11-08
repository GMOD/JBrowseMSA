/**
 * Fails when a docs/tutorials page drifts from the shape its CLAUDE.md sets:
 *
 *   node scripts/check-tutorials.mjs [page.md ...]
 *
 * - the opening ends in 3 to 5 bullets, one per stage of the page, under a
 *   lead-in ending in a colon
 * - the page opens on `## Prerequisites` then `## The data`,
 *   and closes on `## Reproduce it end to end`, `## See also`, `## References`
 * - neither opening section carries a convenience pitch ("every figure below
 *   links to the live view"), which every page could say and so says nothing
 * - `## The data` says who fetches the files before it lists
 *   them, and lists a file this repo hosts only where a fence on the page reads
 *   it; the rest go in a <details>, since a reader takes a visible bullet as
 *   something to download
 * - `## Reproduce it end to end` says what the script does in a numbered list
 *   above the fence that runs it
 * - a `## See also` entry is a bare link
 * - the step that opens the result carries a Web | R switch whose R panel
 *   loads ggmsaview and shows the figure its fence saves
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const tutorialDir = path.join(repoRoot, 'docs', 'tutorials')
const HOSTED = 'https://gmod.org/JBrowseMSA/demo/data/'
const PITCH =
  /every figure below links|nothing to read along|nothing to install/i
const OPENING = ['Prerequisites', 'The data']
const CLOSING = ['Reproduce it end to end', 'See also', 'References']

function sections(text) {
  const lines = text.split('\n')
  const starts = []
  let fenced = false
  for (const [i, line] of lines.entries()) {
    if (line.startsWith('```')) {
      fenced = !fenced
    }
    if (!fenced && line.startsWith('## ')) {
      starts.push(i)
    }
  }
  return starts.map((start, k) => ({
    title: lines[start].slice(3).trim(),
    lines: lines.slice(start + 1, starts[k + 1]),
  }))
}

function fences(text) {
  return [...text.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)]
    .map(m => m[1])
    .join('\n')
}

function withoutDetails(lines) {
  return lines
    .join('\n')
    .replace(/<details>[\s\S]*?<\/details>/g, '')
    .split('\n')
}

function checkPage(file) {
  const text = fs.readFileSync(file, 'utf8')
  const secs = sections(text)
  const titles = secs.map(s => s.title)
  const problems = []

  const opening = text.slice(0, text.search(/^## /m)).trim().split('\n')
  const firstOpeningBullet = opening.findIndex(l => l.startsWith('- '))
  const openingBullets = opening.filter(l => l.startsWith('- ')).length
  if (openingBullets < 3 || openingBullets > 5) {
    problems.push(
      `the opening has ${openingBullets} bullets; list 3 to 5 stages the page runs`,
    )
  } else if (
    !opening
      .slice(0, firstOpeningBullet)
      .findLast(l => l.trim())
      ?.trimEnd()
      .endsWith(':')
  ) {
    problems.push('the sentence before the opening bullets must end in a colon')
  }

  if (OPENING.some((t, i) => titles[i] !== t)) {
    problems.push(`opens on ${titles.slice(0, 2).join(', ')}`)
  }
  if (CLOSING.some((t, i) => titles.at(i - CLOSING.length) !== t)) {
    problems.push(`closes on ${titles.slice(-3).join(', ')}`)
  }

  const byTitle = new Map(secs.map(s => [s.title, s.lines]))
  for (const title of OPENING) {
    const pitch = (byTitle.get(title) ?? []).find(l => PITCH.test(l))
    if (pitch) {
      problems.push(`convenience pitch in ${title}: "${pitch.trim()}"`)
    }
  }

  const data = byTitle.get('The data') ?? []
  const firstBullet = data.findIndex(l => /^(- |\|)/.test(l))
  const lead = data.slice(0, firstBullet === -1 ? data.length : firstBullet)
  if (!/fetch|download/i.test(lead.join(' '))) {
    problems.push('The data never says who fetches the files')
  }
  const bare = data.find(l =>
    /^\s*(- )?(?!.*\]\()[^|]*https?:\/\/\S{60,}\s*$/.test(l),
  )
  if (bare) {
    problems.push(
      `The data prints a bare URL, link a file name instead: ${bare.trim()}`,
    )
  }
  const fenceText = fences(text)
  for (const line of withoutDetails(data)) {
    for (const url of line.match(/https:\/\/[^\s)]+/g) ?? []) {
      if (
        url.startsWith(HOSTED) &&
        !fenceText.includes(url.slice(HOSTED.length))
      ) {
        problems.push(`hosted file listed but read by no fence: ${url}`)
      }
    }
  }

  const reproduce = byTitle.get('Reproduce it end to end') ?? []
  const firstFence = reproduce.findIndex(l => l.startsWith('```'))
  if (!reproduce.slice(0, firstFence).some(l => l.startsWith('1. '))) {
    problems.push('Reproduce has no numbered list above its fence')
  }

  const usage =
    /^<!-- usage: web -->$([\s\S]*?)^<!-- usage: r -->$([\s\S]*?)^<!-- \/usage -->$/m.exec(
      text,
    )
  if (!usage) {
    problems.push(
      'no Web | R switch at the step that opens the result (see "Web and R")',
    )
  } else {
    const rPanel = usage[2]
    if (!/^```r\n[\s\S]*?library\(ggmsaview\)/m.test(rPanel)) {
      problems.push('the R panel has no ```r fence that loads ggmsaview')
    }
    const shown = /\.\.\/media\/([^)\s]+)/.exec(rPanel)?.[1]
    if (!shown || !rPanel.includes(`"${shown}"`)) {
      problems.push('the R panel does not show the figure its fence saves')
    }
  }

  for (const line of byTitle.get('See also') ?? []) {
    if (line.startsWith('- ') && !/^- \[[^\]]+\]\([^)\s]+\)$/.test(line)) {
      problems.push(`See also entry is not a bare link: ${line}`)
    }
  }
  return problems
}

const pages =
  process.argv.length > 2
    ? process.argv.slice(2)
    : fs
        .readdirSync(tutorialDir)
        .filter(f => f.endsWith('.md') && f !== 'CLAUDE.md')
        .map(f => path.join(tutorialDir, f))

let failed = 0
for (const page of pages) {
  const problems = checkPage(page)
  if (problems.length) {
    failed++
    console.log(path.basename(page))
    for (const p of problems) {
      console.log(`  ${p}`)
    }
  }
}
console.log(`${pages.length - failed} of ${pages.length} tutorials match`)
process.exit(failed ? 1 : 0)

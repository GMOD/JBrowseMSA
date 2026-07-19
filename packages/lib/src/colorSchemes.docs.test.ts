import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

import colorSchemes from './colorSchemes.ts'

// Guard against doc drift: every color-scheme name listed in the JS embedding
// docs (USAGE.md) must be a real registered scheme, so a rename or removal in
// colorSchemes.ts can't silently leave a dead name in the docs that users copy.
// (Subset check only — a registered scheme may intentionally go undocumented.)
test('color schemes listed in USAGE.md all exist', () => {
  const registered = new Set(Object.keys(colorSchemes))
  const usage = readFileSync(
    new URL('../../../USAGE.md', import.meta.url),
    'utf8',
  )

  const section = /## Color schemes\n([\s\S]*?)\n## /.exec(usage)?.[1]
  expect(section, 'could not find the "## Color schemes" section').toBeTruthy()

  // drop the bold labels (**Protein:**, **Dynamic (per-column):**, …), leaving
  // just the comma-separated scheme names
  const names = section!.replace(/\*\*[^*]+\*\*/g, '').match(/[a-z][a-z0-9_]+/g)
  expect(names?.length).toBeGreaterThan(0)

  const unknown = names!.filter(name => !registered.has(name))
  expect(
    unknown,
    `documented but not registered: ${unknown.join(', ')}`,
  ).toEqual([])
})

// Same guard for the R package docs, whose color_scheme names pass straight
// through as colorSchemeName with no remapping — a name that isn't registered
// silently renders with no coloring.
test('color schemes listed in the R README all exist', () => {
  const registered = new Set(Object.keys(colorSchemes))
  const readme = readFileSync(
    new URL('../../r-msaview/README.md', import.meta.url),
    'utf8',
  )

  const section = (/## Color schemes\n([\s\S]*?)\n## /.exec(readme))?.[1]
  expect(section, 'could not find the "## Color schemes" section').toBeTruthy()

  // names are backtick-quoted, e.g. `jalview_taylor`
  const names = [...section!.matchAll(/`([a-z][a-z0-9_]+)`/g)].map(m => m[1])
  expect(names.length).toBeGreaterThan(0)

  const unknown = names.filter(name => !registered.has(name))
  expect(
    unknown,
    `documented but not registered: ${unknown.join(', ')}`,
  ).toEqual([])
})

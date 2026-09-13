import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

import colorSchemes from './colorSchemes.ts'

// Guard against doc drift: every color-scheme name a user copies out of the docs
// must be a real registered scheme, so a rename or removal in colorSchemes.ts
// can't leave a dead name behind. The R package and the CLI pass the name
// straight through as colorSchemeName with no remapping, so an unregistered one
// there renders with no coloring at all. (Subset check only -- a registered
// scheme may intentionally go undocumented.)

// comma-separated bare names, after dropping the bold labels (**Protein:**, ...)
const bare = (section: string) =>
  section.replace(/\*\*[^*]+\*\*/g, '').match(/[a-z][a-z0-9_]+/g) ?? []

// backtick-quoted names, e.g. `jalview_taylor`. A glob like `jalview_*` and a
// suffix like `_dynamic` fall outside the pattern, which is what we want.
const quoted = (section: string) =>
  [...section.matchAll(/`([a-z][a-z0-9_]+)`/g)].flatMap(m =>
    m[1] ? [m[1]] : [],
  )

const docs = [
  { file: '../../../USAGE.md', heading: '## Color schemes', names: bare },
  {
    file: '../../r-msaview/README.md',
    heading: '## Color schemes',
    names: quoted,
  },
  { file: '../../cli/README.md', heading: '### Color schemes', names: quoted },
]

test.each(docs)(
  'color schemes listed in $file all exist',
  ({ file, heading, names }) => {
    const doc = readFileSync(new URL(file, import.meta.url), 'utf8')
    const start = doc.indexOf(`${heading}\n`)
    expect(start, `could not find the "${heading}" section`).toBeGreaterThan(-1)
    const rest = doc.slice(start + heading.length)
    const end = rest.search(/\n#{1,3} /)
    const section = end === -1 ? rest : rest.slice(0, end)

    const found = names(section)
    expect(found.length).toBeGreaterThan(0)

    const registered = new Set(Object.keys(colorSchemes))
    const unknown = found.filter(name => !registered.has(name))
    expect(
      unknown,
      `documented but not registered: ${unknown.join(', ')}`,
    ).toEqual([])
  },
)

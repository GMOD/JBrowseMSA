import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

import colorSchemes from './colorSchemes.ts'

// Every color-scheme name a user copies out of the docs must be a registered
// scheme. The R package and the CLI pass the name straight through as
// colorSchemeName, so an unregistered one there renders with no coloring. Their
// READMEs may leave a scheme out; USAGE.md lists every one.

// comma-separated bare names, after dropping the bold labels (**Protein:**, ...)
const bare = (section: string) =>
  section.replace(/\*\*[^*]+\*\*/g, '').match(/[a-z][a-z0-9_]+/g) ?? []

// backtick-quoted names, e.g. `jalview_taylor`. A glob like `jalview_*` and a
// suffix like `_dynamic` fall outside the pattern.
const quoted = (section: string) =>
  [...section.matchAll(/`([a-z][a-z0-9_]+)`/g)].flatMap(m =>
    m[1] ? [m[1]] : [],
  )

function section(file: string, heading: string) {
  const doc = readFileSync(new URL(file, import.meta.url), 'utf8')
  const start = doc.indexOf(`${heading}\n`)
  expect(start, `could not find the "${heading}" section`).toBeGreaterThan(-1)
  const rest = doc.slice(start + heading.length)
  const end = rest.search(/\n#{1,3} /)
  return end === -1 ? rest : rest.slice(0, end)
}

const registered = Object.keys(colorSchemes)

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
    const found = names(section(file, heading))
    expect(found.length).toBeGreaterThan(0)

    const unknown = found.filter(name => !registered.includes(name))
    expect(
      unknown,
      `documented but not registered: ${unknown.join(', ')}`,
    ).toEqual([])
  },
)

test('USAGE.md lists every registered color scheme', () => {
  const documented = bare(section('../../../USAGE.md', '## Color schemes'))
  expect(documented.toSorted()).toEqual(registered.toSorted())
})

import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

// Guard against doc drift: the props table in USAGE.md is what an embedder
// copies from, and `residueMappings` shipped without reaching it. Both
// directions matter -- a prop missing from the table is invisible, a table row
// for a prop that no longer exists is a broken copy-paste.
test('the USAGE.md props table lists exactly the MSAViewer props', () => {
  const source = readFileSync(new URL('MSAViewer.tsx', import.meta.url), 'utf8')
  const usage = readFileSync(
    new URL('../../../../USAGE.md', import.meta.url),
    'utf8',
  )

  const iface = /interface MSAViewerProps \{\n([\s\S]*?)\n\}/.exec(source)?.[1]
  expect(iface, 'could not find the MSAViewerProps interface').toBeTruthy()
  const props = [...iface!.matchAll(/^ {2}(\w+)\?:/gm)].map(m => m[1])
  expect(props.length).toBeGreaterThan(10)

  const table = /\nProps:\n\n([\s\S]*?)\n\n/.exec(usage)?.[1]
  expect(table, 'could not find the props table in USAGE.md').toBeTruthy()
  const documented = [...table!.matchAll(/^\| `(\w+)`/gm)].map(m => m[1])

  const alphabetical = (list: (string | undefined)[]) =>
    [...list].sort((a, b) => (a ?? '').localeCompare(b ?? ''))
  expect(alphabetical(documented)).toEqual(alphabetical(props))
})

test('USAGE.md lists exactly the <jbrowse-msa> attributes and properties', () => {
  const source = readFileSync(new URL('../element.ts', import.meta.url), 'utf8')
  const usage = readFileSync(
    new URL('../../../../USAGE.md', import.meta.url),
    'utf8',
  )
  const names = (text: string | undefined, pattern: RegExp) =>
    [...(text ?? '').matchAll(pattern)].map(m => m[1]).toSorted()

  const attributes = /const ownAttributes = \[([\s\S]*?)\]/.exec(source)?.[1]
  const properties = /type ElementData = Pick<\s*MSAViewerProps,([^>]*)>/.exec(
    source,
  )?.[1]
  expect(attributes, 'could not find ownAttributes').toBeTruthy()
  expect(properties, 'could not find ElementData').toBeTruthy()

  const docs = /\nAttributes:\s([\s\S]*?)\.\sProperties:\s([\s\S]*?)\.\s/.exec(
    usage,
  )
  expect(docs, 'could not find the element attribute list').toBeTruthy()

  expect(names(docs![1], /`([\w-]+)`/g)).toEqual(
    names(attributes, /'([\w-]+)'/g),
  )
  expect(names(docs![2], /`(\w+)`/g)).toEqual(names(properties, /'(\w+)'/g))
})

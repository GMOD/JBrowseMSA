import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

// Guard against doc drift: the props table in USAGE.md is what an embedder
// copies from, and `residueMappings` shipped without reaching it. Both
// directions matter -- a prop missing from the table is invisible, a table row
// for a prop that no longer exists is a broken copy-paste.
test('the USAGE.md props table lists exactly the MSAViewer props', () => {
  const source = readFileSync(new URL('MSAViewer.tsx', import.meta.url), 'utf8')
  const usage = readFileSync(new URL('../../../../USAGE.md', import.meta.url), 'utf8')

  const iface = /interface MSAViewerProps \{\n([\s\S]*?)\n\}/.exec(source)?.[1]
  expect(iface, 'could not find the MSAViewerProps interface').toBeTruthy()
  const props = [...iface!.matchAll(/^ {2}(\w+)\?:/gm)].map(m => m[1])
  expect(props.length).toBeGreaterThan(10)

  const table = /\nProps:\n\n([\s\S]*?)\n\n/.exec(usage)?.[1]
  expect(table, 'could not find the props table in USAGE.md').toBeTruthy()
  const documented = [...table!.matchAll(/^\| `(\w+)`/gm)].map(m => m[1])

  expect([...documented].sort()).toEqual([...props].sort())
})

// The Python widget wraps MSAViewer, and a prop it cannot reach is a gap a
// reader finds by not finding it. This pins it to MSAViewerProps. The R
// package, GMOD/ggmsaview, runs the same check in its test-props.R, against
// the prop list its build reads out of MSAViewer.tsx.
//
// The invariant is per prop, not per argument name: Python declares `msa` and
// `msa_url` separately, and the check asks only that every prop arrives.
//
// A failure lists the props that did not arrive, each with the edit that lands
// it, so the diff is the instruction.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

const PROPS_FILE = 'packages/lib/src/components/MSAViewer.tsx'
const PY_TRAITS = 'packages/python/jbrowsemsa/__init__.py'
const PY_RENDER = 'packages/python/src/render.ts'

const PY_FIX =
  `add the trait to ${PY_TRAITS}, the field to Traits, the name to ` +
  `INPUT_TRAITS and the line to propsFromModel in ${PY_RENDER}`

/**
 * Props deliberately absent from the widget, each with the reason. An entry
 * here is a decision; a prop in neither list fails the test.
 */
const notExposed: Record<string, string> = {
  onCellHover:
    'a message per pointer move floods a kernel; the widget reports clicks and the viewport instead',
  onModel: 'hands back a live MST model, which no notebook trait can carry',
}

/** callbacks the widget turns into traits rather than props */
const asEvents: Record<string, string> = {
  onCellClick: 'clicked',
  onViewportChange: 'viewport',
  onSelectionChange: 'selection',
}

function msaViewerProps() {
  const body = /export interface MSAViewerProps \{([\s\S]*?)\n\}/.exec(
    read(PROPS_FILE),
  )
  if (!body) {
    throw new Error(`no MSAViewerProps interface in ${PROPS_FILE}`)
  }
  return [...body[1]!.matchAll(/^ {2}(\w+)\??:/gm)].map(m => m[1]!)
}

/** propsFromModel names each prop it passes to MSAViewer */
function pythonProps() {
  const body = /export function propsFromModel[\s\S]*?\n\}/.exec(
    read(PY_RENDER),
  )
  if (!body) {
    throw new Error(`no propsFromModel in ${PY_RENDER}`)
  }
  return new Set([...body[0].matchAll(/^ {4}(\w+):/gm)].map(m => m[1]!))
}

const props = msaViewerProps()

test('MSAViewerProps is readable, and this test is looking at all of it', () => {
  // a rename or a reformat that broke the regexes would leave every other
  // assertion here passing over an empty list
  expect(props).toContain('msa')
  expect(props).toContain('residueColor')
  expect(props.length).toBeGreaterThan(20)
})

test('every MSAViewer prop reaches the Python widget', () => {
  const reached = pythonProps()
  expect(
    props
      .filter(p => !reached.has(p) && !(p in notExposed) && !(p in asEvents))
      .map(p => `${p}: ${PY_FIX}`),
  ).toEqual([])
})

test('the widget passes no prop MSAViewer does not have', () => {
  const known = new Set(props)
  expect([...pythonProps()].filter(p => !known.has(p))).toEqual([])
})

test('the callbacks the widget turns into traits are wired', () => {
  const py = read(PY_TRAITS) + read(PY_RENDER)
  expect(
    Object.entries(asEvents)
      .filter(([, trait]) => !py.includes(trait))
      .map(([prop, trait]) => `${prop}: no trait named ${trait}`),
  ).toEqual([])
})

test('a prop left out of the widget says why', () => {
  const known = new Set(props)
  const stale = Object.entries(notExposed)
    .filter(([name, reason]) => !known.has(name) || reason.length < 20)
    .map(([name]) => name)
  expect(stale).toEqual([])
})

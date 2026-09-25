// The R package and the Python widget wrap the same MSAViewer, and a prop that
// reaches only one of them is a gap a reader finds by not finding it. This
// pins both to MSAViewerProps.
//
// The invariant is per prop, not per argument name. R's `msa` takes text, a
// path, an object or a URL and produces `msa` or `msaFilehandle` from one
// argument, where Python declares `msa` and `msa_url` separately. Demanding the
// same argument names would make R worse, so each package says how it reaches a
// prop and this checks that it reaches all of them.
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
const R_FILE = 'packages/r-msaview/R/msaview.R'
const PY_TRAITS = 'packages/python/msaview/__init__.py'
const PY_RENDER = 'packages/python/src/render.ts'

const R_FIX =
  `add the argument to msaview() in ${R_FILE}, assign it in the props list, ` +
  'document it with @param, and rerun roxygen'
const PY_FIX =
  `add the trait to ${PY_TRAITS}, the field to Traits, the name to ` +
  `INPUT_TRAITS and the line to propsFromModel in ${PY_RENDER}`

/**
 * Props deliberately absent from both wrappers, each with the reason. An entry
 * here is a decision; a prop in neither list fails the test.
 */
const notExposed: Record<string, string> = {
  onCellHover:
    'a message per pointer move floods a kernel and a Shiny websocket; both report clicks and the viewport instead',
  onModel:
    'hands back a live MST model, which neither a notebook trait nor a Shiny input can carry',
}

/** callbacks each wrapper turns into its own idiom rather than a prop */
const asEvents: Record<string, { r: string; py: string }> = {
  onCellClick: { r: '_click', py: 'clicked' },
  onViewportChange: { r: '_viewport', py: 'viewport' },
  onSelectionChange: { r: '_selection', py: 'selection' },
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

/**
 * the `props$x <- y` keys msaview() builds. `height` is not among them: an
 * htmlwidget sizes itself, so msaview() hands it to createWidget and the
 * widget's JS passes it on.
 */
function rProps() {
  const built = [...read(R_FILE).matchAll(/^ {2}props\$(\w+) <-/gm)].map(
    m => m[1]!,
  )
  return new Set([...built, 'height'])
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

function missingFrom(reached: Set<string>, fix: string) {
  return props
    .filter(p => !reached.has(p) && !(p in notExposed) && !(p in asEvents))
    .map(p => `${p}: ${fix}`)
}

const props = msaViewerProps()

test('MSAViewerProps is readable, and this test is looking at all of it', () => {
  // a rename or a reformat that broke the regexes would leave every other
  // assertion here passing over an empty list
  expect(props).toContain('msa')
  expect(props).toContain('residueEncoding')
  expect(props.length).toBeGreaterThan(20)
})

test('every MSAViewer prop reaches the R package', () => {
  expect(missingFrom(rProps(), R_FIX)).toEqual([])
})

test('every MSAViewer prop reaches the Python widget', () => {
  expect(missingFrom(pythonProps(), PY_FIX)).toEqual([])
})

test('neither wrapper passes a prop MSAViewer does not have', () => {
  const known = new Set(props)
  expect([...rProps()].filter(p => !known.has(p))).toEqual([])
  expect([...pythonProps()].filter(p => !known.has(p))).toEqual([])
})

test('the callbacks both wrappers turn into events are wired', () => {
  const r =
    read(R_FILE) + read('packages/r-msaview/inst/htmlwidgets/msaview.js')
  const py = read(PY_TRAITS) + read(PY_RENDER)
  const unwired = Object.entries(asEvents).flatMap(
    ([prop, { r: rn, py: pn }]) =>
      [
        r.includes(rn) ? undefined : `${prop}: no Shiny input named ${rn}`,
        py.includes(pn) ? undefined : `${prop}: no trait named ${pn}`,
      ].filter(Boolean),
  )
  expect(unwired).toEqual([])
})

test('a prop left out of both wrappers says why', () => {
  const known = new Set(props)
  const stale = Object.entries(notExposed)
    .filter(([name, reason]) => !known.has(name) || reason.length < 20)
    .map(([name]) => name)
  expect(stale).toEqual([])
})

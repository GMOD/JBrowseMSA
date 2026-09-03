import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import type React from 'react'

/**
 * Render a React element to a static markup string, for the SVG export.
 *
 * Inlined rather than imported from `@jbrowse/core/util` on purpose, and this
 * one is the removal direction of the rule in CLAUDE.md rather than the
 * addition direction. Core dropped `renderToStaticMarkup` from that barrel in
 * jbrowse-components 0d034e2bd8 -- deliberately, because it was the barrel's
 * only reach into react-dom and the barrel is loaded in the RPC worker, which
 * never renders. The export path is the only caller, so nothing here or in
 * jbrowse-plugin-msaview/-tview failed to build, lint, typecheck, or boot; the
 * published 3.4.0 and 2.2.1 bundles simply threw the first time a user asked
 * for an SVG on a v5 host.
 *
 * A rendering library asking its host for a renderer was the odd coupling. Both
 * `react-dom` and `react-dom/client` are long-established host externals, so
 * this costs a few hundred bytes in the plugin bundle and no duplicate react.
 */
export function renderToStaticMarkup(node: React.ReactElement) {
  const div = document.createElement('div')
  const root = createRoot(div)
  let html: string
  try {
    flushSync(() => {
      root.render(node)
    })
    html = div.innerHTML
  } finally {
    // A real client root, not a server render: effects run, so every `observer`
    // in the tree gets a live MobX reaction. Left mounted, an export of a large
    // alignment keeps tens of thousands of detached nodes subscribed to the
    // model and re-rendering into a dead div on every pan and zoom, once per
    // export ever taken. The markup is a string by here and needs no DOM.
    root.unmount()
  }
  // SVG 1.1 presentation attributes (`fill`, `stroke`) take a <color>, which
  // excludes rgba() -- alpha belongs in a separate fill-opacity. Illustrator and
  // older Inkscape drop an element whose fill they cannot parse, so alpha is
  // stripped rather than left to break the shape. MUI palette values are the
  // usual source. Dropping rather than converting is what the figure snapshots
  // encode.
  return html.replaceAll(/\brgba\((.+?),[^,]+?\)/g, 'rgb($1)')
}

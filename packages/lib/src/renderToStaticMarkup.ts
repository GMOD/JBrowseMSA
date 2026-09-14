import { colord } from 'colord'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import type React from 'react'

/**
 * Render a React element to a static markup string, for the SVG export.
 *
 * Inlined because core removed `renderToStaticMarkup` from the
 * `@jbrowse/core/util` barrel in jbrowse-components 0d034e2bd8; see the
 * `@jbrowse/core` note in CLAUDE.md. `react-dom` and `react-dom/client` are
 * host externals, so this adds a few hundred bytes to the plugin bundle and no
 * duplicate react.
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
    // effects run in a client root, so every `observer` holds a MobX reaction;
    // a mounted export of a large alignment would keep tens of thousands of
    // detached nodes re-rendering on every pan and zoom
    root.unmount()
  }
  return html
}

const tag = /<[a-zA-Z][^>]*>/g
const colorAttr = /\b(fill|stroke|stop-color)="([^"]+)"/g

/**
 * Rewrites every color an SVG 1.1 presentation attribute cannot hold.
 *
 * `fill`, `stroke` and `stop-color` take a keyword, a hex triplet or rgb(). MUI
 * palette values use rgba() and the percent-identity scheme uses hsl(), and
 * Illustrator and older Inkscape drop an element whose fill they cannot parse.
 * Alpha moves to the matching -opacity attribute unless the element already
 * carries one.
 */
export function svgSafeColors(html: string) {
  return html.replaceAll(tag, el =>
    el.replaceAll(colorAttr, (match, attr: string, value: string) => {
      if (!/^(rgba|hsl)/i.test(value)) {
        return match
      }
      const color = colord(value)
      if (!color.isValid()) {
        return match
      }
      const alpha = color.alpha()
      const hex = color.alpha(1).toHex()
      return alpha === 1 || el.includes(`${attr}-opacity=`)
        ? `${attr}="${hex}"`
        : `${attr}="${hex}" ${attr}-opacity="${alpha}"`
    }),
  )
}

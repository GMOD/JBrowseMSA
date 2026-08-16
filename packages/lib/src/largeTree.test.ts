// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// jsdom has no 2d context, and measureTextCanvas throws without one. Only the
// width matters here, so a stub keeps the test about tree size.
HTMLCanvasElement.prototype.getContext = (() => ({
  font: '12px sans-serif',
  measureText: (t: string) => ({ width: t.length * 7 }),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext

// The import form ships a "230k COVID-19 samples (tree only)" example, so a tree
// this size is a supported input rather than a hypothetical. Every leaf gets a
// measured label, and anything that then reduces over them per row has to do it
// without passing one argument per row.
function flatNewick(n: number) {
  return `(${Array.from({ length: n }, (_, i) => `s${i}:0.1`).join(',')});`
}

test('a tree far past the argument limit still lays out', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { tree: flatNewick(200_000) },
  })
  model.setWidth(1000)

  expect(model.numRows).toBe(200_000)
  // 's199999' is the longest name, at 7 chars * 7px
  expect(model.labelsWidth).toBe(49)
  expect(model.treeWidth).toBeGreaterThan(0)
})

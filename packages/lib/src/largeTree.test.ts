// @vitest-environment jsdom
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

// jsdom has no 2d context, so measureTextCanvas falls back to an estimate. Only
// the width matters here, so a stub keeps the test about tree size.
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
  // 's199999' is the longest name, at 7 chars * 7px, scaled from the reference
  // font size the labels are measured at down to the current one (13/16)
  expect(model.labelsWidth).toBeCloseTo((49 * 13) / 16)
  expect(model.treeWidth).toBeGreaterThan(0)
})

test('re-hovering the same tree node does not re-walk the tree', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { tree: flatNewick(200_000) },
  })
  model.setWidth(1000)

  const leafId = model.leaves[1000]!.data.id
  model.setHoveredTreeNode(leafId)
  const first = model.hoveredTreeNode

  // the tree's mousemove handler fires this on every event, so an unchanged id
  // has to leave the state object alone: rebuilding it walks all 200k nodes and
  // invalidates every overlay that reads hoveredRowIndices
  model.setHoveredTreeNode(leafId)
  expect(model.hoveredTreeNode).toBe(first)

  model.setHoveredTreeNode(undefined)
  expect(model.hoveredTreeNode).toBeUndefined()
})

test('a vertical zoom does not re-measure every label', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { tree: flatNewick(200_000) },
  })
  model.setWidth(1000)

  const before = model.labelWidthMap
  model.setRowHeight(24)
  expect(model.labelWidthMap).toBe(before)
  expect(model.labelsWidth).toBeCloseTo((49 * 18) / 16)
})

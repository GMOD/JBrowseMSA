// @vitest-environment jsdom
import { applySnapshot, getSnapshot } from '@jbrowse/mobx-state-tree'
import { beforeAll, expect, test, vi } from 'vitest'

import {
  labelFitFontSize,
  maxTreeAreaShare,
  minTreeWidth,
} from './constants.ts'
import MSAModelF from './model.ts'

// with no 2d context, measureTextCanvas estimates 0.6em per character
const charWidth = labelFitFontSize * 0.6

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

const names = ['Caenorhabditis_elegans_query', 'b', 'c', 'd']
const msa = names.map(n => `>${n}\nMKAANSE`).join('\n')
const tree = `((${names[0]}:1,b:2):5,(c:1,d:3):1);`

function makeModel(snapshot: Record<string, unknown> = {}, width = 1200) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree },
    ...snapshot,
  })
  model.setWidth(width)
  return model
}

test('the fit is the widest label beside the tree', () => {
  const model = makeModel()
  expect(model.treeAreaWidth).toBeUndefined()
  expect(model.maxTipLabelWidth).toBeCloseTo(names[0]!.length * charWidth)
  expect(model.effectiveTreeAreaWidth).toBe(model.fittedTreeAreaWidth)
  expect(
    model.marginLeft + model.effectiveTreeWidth + model.labelColumnWidth,
  ).toBeCloseTo(model.effectiveTreeAreaWidth, -0.5)
})

test('with no tree drawn, the fit is the labels and their padding', () => {
  const model = makeModel({ drawTree: false })
  expect(model.effectiveTreeAreaWidth).toBe(
    Math.ceil(model.marginLeft + names[0]!.length * charWidth + 6),
  )
})

test('a width in the snapshot wins over the fit', () => {
  const model = makeModel({ treeAreaWidth: 200, treeWidth: 100 })
  expect(model.effectiveTreeAreaWidth).toBe(200)
  expect(model.effectiveTreeWidth).toBe(100)
  expect(getSnapshot(model)).toMatchObject({
    treeAreaWidth: 200,
    treeWidth: 100,
  })
})

test('a tree width alone survives the fit and the snapshot', () => {
  const model = makeModel({ treeWidth: 160 })
  expect(model.treeAreaWidth).toBeUndefined()
  expect(model.effectiveTreeWidth).toBe(160)
  const reloaded = makeModel(getSnapshot(model))
  expect(reloaded.effectiveTreeWidth).toBe(160)
})

test('a vertical zoom leaves the tree area where it is', () => {
  const model = makeModel()
  const fitted = model.effectiveTreeAreaWidth
  for (const rowHeight of [4, 10, 30]) {
    model.setRowHeight(rowHeight)
    expect(model.effectiveTreeAreaWidth).toBe(fitted)
  }
})

test('a session saved zoomed out reopens at the width it was saved at', () => {
  const model = makeModel({ rowHeight: 4 })
  expect(model.showTreeText).toBe(false)
  const reloaded = makeModel(getSnapshot(model))
  expect(reloaded.effectiveTreeAreaWidth).toBe(model.effectiveTreeAreaWidth)
  expect(reloaded.effectiveTreeAreaWidth).toBe(
    makeModel().effectiveTreeAreaWidth,
  )
})

test('a zoom that hides the labels gives their column to the tree', () => {
  const model = makeModel()
  expect(model.effectiveTreeWidth).toBeLessThan(
    model.effectiveTreeAreaWidth - model.marginLeft,
  )
  model.setRowHeight(4)
  expect(model.effectiveTreeWidth).toBe(
    model.effectiveTreeAreaWidth - model.marginLeft,
  )
})

test('where the share binds, the tree keeps its floor', () => {
  const model = makeModel({}, 400)
  expect(model.effectiveTreeAreaWidth).toBe(400 * maxTreeAreaShare)
  expect(model.effectiveTreeWidth).toBe(minTreeWidth)
})

test('with no alignment, the share of the view does not bind', () => {
  const model = MSAModelF().create({ type: 'MsaView', data: { tree } })
  model.setWidth(400)
  expect(model.effectiveTreeAreaWidth).toBeGreaterThan(400 * maxTreeAreaShare)
  expect(model.effectiveTreeAreaWidth).toBe(
    Math.ceil(
      model.marginLeft + model.effectiveTreeWidth + model.labelColumnWidth,
    ),
  )
})

test('a drag sets the width and the menu toggle returns to the fit', () => {
  const model = makeModel({ treeWidth: 160 })
  model.setTreeAreaWidth(250)
  expect(model.effectiveTreeAreaWidth).toBe(250)
  expect(model.treeWidth).toBeUndefined()
  expect(getSnapshot(model).treeAreaWidth).toBe(250)
  model.setTreeAreaWidth(undefined)
  expect(model.effectiveTreeAreaWidth).toBe(model.fittedTreeAreaWidth)
})

test('applySnapshot of an older snapshot keeps its width, and one without fits', () => {
  const model = makeModel()
  const fitted = model.effectiveTreeAreaWidth
  const old = { ...getSnapshot(model), treeAreaWidth: 333 }
  applySnapshot(model, old)
  expect(model.effectiveTreeAreaWidth).toBe(333)
  applySnapshot(model, { ...old, treeAreaWidth: undefined })
  expect(model.effectiveTreeAreaWidth).toBe(fitted)
  expect(model.effectiveTreeAreaWidth).toBe(model.fittedTreeAreaWidth)
})

test('collapsing or focusing a clade leaves the tree area where it is', () => {
  const model = makeModel()
  const fitted = model.effectiveTreeAreaWidth
  const clade = model.leaves[0]!.parent!.data.id
  model.setShowOnly(clade)
  expect(model.effectiveTreeAreaWidth).toBe(fitted)
  model.setShowOnly(undefined)
  model.toggleCollapsed(clade)
  expect(model.effectiveTreeAreaWidth).toBe(fitted)
})

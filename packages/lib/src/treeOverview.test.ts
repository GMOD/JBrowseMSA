// @vitest-environment jsdom
//
// The overview is the brush on the row scale: a point on it picks a subtree to
// focus, the way a drag on the minimap picks a run of columns.
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

const tree = '(((A,B),(C,D)),((E,F),(G,H)));'

function makeModel(overviewHeight = 8) {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { tree },
    showTreeOverview: true,
    overviewHeight,
  })
  model.setWidth(800)
  return model
}

test('the overview covers every tip of the tree', () => {
  const model = makeModel()
  expect(model.treeOverviewLayout!.numTips).toBe(8)
  expect(model.rowNames).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
})

test('a point picks the deepest subtree covering the rows under it', () => {
  const model = makeModel()
  // one pixel per tip: the point covers row 4 alone, and E is a tip, so the
  // pick is the pair it sits in
  const pair = model.treeOverviewHit(4)!
  expect(pair.rows).toEqual([4, 5])

  model.setShowOnly(pair.id)
  expect(model.rowNames).toEqual(['E', 'F'])
})

test('a point covering more rows picks the subtree that holds them all', () => {
  const model = makeModel(2)
  // four tips per pixel: the point covers rows 4 to 7, which no pair holds
  const half = model.treeOverviewHit(1)!
  expect(half.rows).toEqual([4, 7])

  model.setShowOnly(half.id)
  expect(model.rowNames).toEqual(['E', 'F', 'G', 'H'])
})

test('a point covering the whole tree picks nothing to focus', () => {
  const model = makeModel(1)
  expect(model.treeOverviewHit(0)).toBeUndefined()
})

test('the focus box is the focused subtree, in the overview row space', () => {
  const model = makeModel()
  model.setShowOnly(model.treeOverviewHit(4)!.id)

  // the overview keeps drawing the whole tree, so the box sits at the rows the
  // focused pair has there rather than at the two rows now on screen
  expect(model.treeOverviewFocusRows).toEqual([4, 5])
  expect(model.treeOverviewLayout!.numTips).toBe(8)
})

test('a click inside the box clears the focus', () => {
  const model = makeModel()
  model.treeOverviewClick(4)
  expect(model.rowNames).toEqual(['E', 'F'])

  model.treeOverviewClick(5)
  expect(model.showOnly).toBeUndefined()
  expect(model.rowNames).toHaveLength(8)
})

test('a click outside the box moves the focus', () => {
  const model = makeModel()
  model.treeOverviewClick(4)
  model.treeOverviewClick(0)
  expect(model.rowNames).toEqual(['A', 'B'])
})

test('a collapsed clade is one row of the overview', () => {
  const model = makeModel()
  const pair = model.treeOverviewHit(4)!
  model.toggleCollapsed(pair.id)
  expect(model.treeOverviewLayout!.numTips).toBe(7)
})

test('the overview costs nothing with the toggle off', () => {
  const model = makeModel()
  model.setShowTreeOverview(false)
  expect(model.treeOverviewLayout).toBeUndefined()
  expect(model.treeOverviewHit(4)).toBeUndefined()
  expect(model.treeOverviewHeight).toBe(0)
})

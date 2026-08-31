import { expect, test } from 'vitest'

import stateModelFactory from './model.ts'

const MsaView = stateModelFactory()

function loaded() {
  const model = MsaView.create({
    type: 'MsaView',
    data: { msa: '>a\nAC\n>b\nAC\n>c\nAC\n>d\nAC', tree: '((a,b),(c,d));' },
  })
  model.setWidth(1000)
  return model
}

test('reset returns to the import form', () => {
  const model = loaded()
  expect(model.dataInitialized).toBe(true)
  model.reset()
  expect(model.dataInitialized).toBe(false)
})

// generateNodeIds derives ids from the path, so 'node-0-0-1' is the root's
// first child in EVERY tree. Carrying collapsed/showOnly across a reset opens
// the next file collapsed, or focused on a subtree, with nothing on screen
// saying why
test('reset drops view state that names the old data', () => {
  const model = loaded()
  const innerNode = model.hierarchy.children![0]!.data.id
  model.toggleCollapsed(innerNode)
  model.setShowOnly(innerNode)
  model.drawRelativeTo('a')
  model.setHighlightedColumns([0, 1])
  model.setMousePos(1, 1)
  model.setMouseClickPos(1, 1)
  model.setHoveredTreeNode(innerNode)

  model.reset()

  expect([...model.collapsed]).toEqual([])
  expect(model.showOnly).toBeUndefined()
  expect(model.relativeTo).toBeUndefined()
  expect(model.highlightedColumns).toBeUndefined()
  expect(model.mouseCol).toBeUndefined()
  expect(model.mouseClickCol).toBeUndefined()
  expect(model.hoveredTreeNode).toBeUndefined()
})

test('a file opened after a reset is not collapsed by the previous one', () => {
  const model = loaded()
  model.toggleCollapsed(model.hierarchy.children![0]!.data.id)
  expect(model.numRows).toBeLessThan(4)

  model.reset()
  model.setData({
    msa: '>x\nGT\n>y\nGT\n>z\nGT\n>w\nGT',
    tree: '((x,y),(z,w));',
  })
  expect(model.numRows).toBe(4)
  expect(model.rowNames).toEqual(['x', 'y', 'z', 'w'])
})

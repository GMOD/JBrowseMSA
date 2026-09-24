// @vitest-environment jsdom
//
// The parsed tree underneath the layout is shared and cached, so anything
// written onto `data` outlives the frame that wrote it.
import { autorun } from 'mobx'
import { expect, test } from 'vitest'

import { descendants } from './hierarchy.ts'
import MSAModelF from './model.ts'

const msa = '>a\nMKAANSE\n>b\nMKA-NSE\n>c\nMKWWNSE\n>d\nMKWWNQE'

function makeModel(tree: string) {
  const model = MSAModelF().create({
    id: 'tree-layout-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree },
  })
  model.setWidth(800)
  return model
}

test('showing only a clade does not shorten its branch', () => {
  const model = makeModel('((a:1,b:2):5,(c:1,d:3):1);')
  const clade = model.leaves.find(l => l.data.name === 'a')!.parent!
  const { id } = clade.data
  expect(clade.data.length).toBe(5)

  model.setShowOnly(id)
  model.setShowOnly(undefined)

  const after = model.leaves.find(l => l.data.name === 'a')!.parent!
  expect(after.data.id).toBe(id)
  expect(after.data.length).toBe(5)
})

test('the tree spans the tree width whenever it has branch lengths', () => {
  const model = makeModel('((a:1,b:2):5,(c:1,d:3):1);')
  expect(model.allBranchesLength0).toBe(false)
  expect(model.maxBranchLength).toBe(model.treeWidth)

  model.setTreeAreaWidth(model.treeAreaWidth + 200)
  expect(model.maxBranchLength).toBe(model.treeWidth)
})

test('a flat tree with lengths is still a phylogram', () => {
  // every branch here hangs off the root, so a check that looked at the parent
  // of each link called the whole tree length-0 and drew a cladogram
  const model = makeModel('(a:1,b:2,c:3,d:4);')
  expect(model.allBranchesLength0).toBe(false)
  expect(model.showBranchLenEffective).toBe(true)
})

test('the scale bar reads the extent the layout drew', () => {
  // the root's own length is not drawn, so the farthest tip lands at treeWidth
  // and a unit of branch length is treeWidth over the root-to-tip extent
  const model = makeModel('((a:1,b:2):5,(c:1,d:3):1):4;')
  expect(model.rootToTipLength).toBe(7)
  expect(model.pxPerBranchLength).toBe(model.treeWidth / 7)
  const farthest = Math.max(...model.leaves.map(l => l.len!))
  expect(farthest).toBeCloseTo(model.treeWidth)
})

test('a tree with no lengths draws as a cladogram', () => {
  const model = makeModel('((a,b),(c,d));')
  expect(model.allBranchesLength0).toBe(true)
  expect(model.maxBranchLength).toBe(0)
})

test('a tree width that came with the snapshot is honoured', () => {
  // a host opens a narrow tree beside wide labels; the sync used to overwrite
  // it on the first frame
  const model = MSAModelF().create({
    id: 'tree-width-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree: '((a:1,b:2):5,(c:1,d:3):1);' },
    treeAreaWidth: 200,
    treeWidth: 100,
  })
  model.setWidth(800)
  expect(model.treeWidth).toBe(100)

  // dragging the tree area hands the width back to the layout
  model.setTreeAreaWidth(400)
  expect(model.treeWidth).not.toBe(100)
})

test('without one, the tree width follows the tree area', () => {
  const model = makeModel('((a:1,b:2):5,(c:1,d:3):1);')
  const before = model.treeWidth
  model.setTreeAreaWidth(model.treeAreaWidth + 100)
  expect(model.treeWidth).toBe(before + 100)
})

test('an observer of the tip positions alone follows a vertical zoom', () => {
  const model = makeModel('((a:1,b:2):5,(c:1,d:3):1);')
  let seen: number[] = []
  const dispose = autorun(() => {
    seen = model.leaves.map(l => l.x!)
  })
  model.setRowHeight(32)
  expect(seen).toEqual([16, 48, 80, 112])
  dispose()
})

test('a zoom keeps the laid-out nodes and leaves the tree it lays out alone', () => {
  const model = makeModel('((a:1,b:2):5,(c:1,d:3):1);')
  const dispose = autorun(() => {
    void model.hierarchy
  })
  const { leaves, hierarchy, root } = model
  model.setRowHeight(32)
  model.setTreeWidth(300)
  expect(model.leaves).toBe(leaves)
  expect(model.hierarchy).toBe(hierarchy)
  expect(model.root).toBe(root)
  expect(Math.max(...model.leaves.map(l => l.len!))).toBeCloseTo(300)
  expect(
    descendants(root).filter(n => n.x !== undefined || n.len !== undefined),
  ).toEqual([])
  dispose()
})

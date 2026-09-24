// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { descendants, leaves } from './hierarchy.ts'
import MSAModelF from './model.ts'

import type { Clade, TreeOrder, TreeRoot } from './types.ts'

const tips = ['A', 'B', 'C', 'D', 'E']
const msa = tips.map(name => `>${name}\nMKAA`).join('\n')

// (A,B) has the longer branch but fewer tips than (C,(D,E))
const tree = '((A:1,B:1):3,(C:1,(D:1,E:5):1):1);'

function makeModel({
  treeOrder,
  treeRoot,
  clades,
}: { treeOrder?: TreeOrder; treeRoot?: TreeRoot; clades?: Clade[] } = {}) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree },
    ...(treeOrder ? { treeOrder } : {}),
    ...(treeRoot ? { treeRoot } : {}),
    ...(clades ? { clades } : {}),
  })
  model.setWidth(800)
  return model
}

type Model = ReturnType<typeof makeModel>

// the displayed node whose tips are exactly `names`
function nodeOf(model: Model, names: string[]) {
  return descendants(model.root).find(n => {
    const under = leaves(n).map(l => l.data.name)
    return under.length === names.length && under.every(l => names.includes(l))
  })!
}

function idOf(model: Model, names: string[]) {
  return nodeOf(model, names).data.id
}

test('branch length order puts the shorter branch first', () => {
  expect(makeModel().rowNames).toEqual(['C', 'D', 'E', 'A', 'B'])
})

test('input order keeps the file', () => {
  expect(makeModel({ treeOrder: 'input' }).rowNames).toEqual(tips)
})

test('ladderize puts the clade with fewer tips first', () => {
  expect(makeModel({ treeOrder: 'ladderize' }).rowNames).toEqual([
    'A',
    'B',
    'C',
    'D',
    'E',
  ])
  expect(makeModel({ treeOrder: 'ladderizeReverse' }).rowNames).toEqual([
    'D',
    'E',
    'C',
    'A',
    'B',
  ])
})

test('rotating a node swaps its clades, and rotating again restores them', () => {
  const model = makeModel({ treeOrder: 'input' })
  const cde = idOf(model, ['C', 'D', 'E'])
  model.toggleRotated(cde)
  expect(model.rowNames).toEqual(['A', 'B', 'D', 'E', 'C'])
  model.toggleRotated(cde)
  expect(model.rowNames).toEqual(tips)
})

test('a rotate clade seeds the rotation at load', () => {
  const model = makeModel({
    treeOrder: 'input',
    clades: [{ mrca: ['A', 'B'], tips: 2, mark: 'rotate' }],
  })
  expect(model.rowNames).toEqual(['B', 'A', 'C', 'D', 'E'])
})

test('midpoint rooting puts the root halfway along the longest path', () => {
  // A to E is 1 + 3 + 1 + 1 + 5 = 11, and E is 6 from the (D,E) node, so the
  // root sits 0.5 up the branch above (D,E)
  const model = makeModel({ treeOrder: 'input', treeRoot: 'midpoint' })
  const [de, rest] = model.tree.children
  expect(de!.children.map(c => c.name)).toEqual(['D', 'E'])
  expect(de!.length).toBeCloseTo(0.5)
  expect(rest!.length).toBeCloseTo(0.5)
  expect(model.rowNames).toEqual(['D', 'E', 'C', 'A', 'B'])
})

test('rerooting clears the rotations, which name nodes by path', () => {
  const model = makeModel({ treeOrder: 'input' })
  model.toggleRotated(idOf(model, ['A', 'B']))
  model.toggleCollapsed(idOf(model, ['C', 'D', 'E']))
  model.setTreeRoot('midpoint')
  expect(model.rotated).toEqual([])
  expect(model.collapsed).toEqual([])
})

test('setting the same root twice keeps what the user did since', () => {
  const model = makeModel({ treeRoot: 'midpoint' })
  const ab = idOf(model, ['A', 'B'])
  model.toggleRotated(ab)
  model.setTreeRoot('midpoint')
  expect(model.rotated).toEqual([ab])
})

test('reroot here roots on the branch above the node the menu names', () => {
  const model = makeModel({ treeOrder: 'input' })
  model.rerootAt(idOf(model, ['D', 'E']))
  expect(model.treeRoot).toEqual({ outgroup: ['D', 'E'] })
  expect(model.tree.children).toHaveLength(2)
  expect(model.rowNames).toEqual(['D', 'E', 'C', 'A', 'B'])
})

test('rerooting twice resolves the second node against the file tree', () => {
  const model = makeModel({ treeOrder: 'input' })
  model.rerootAt(idOf(model, ['D', 'E']))
  // in the tree rooted above (D,E), the clade (C,A,B) sits on the other side
  // of the same split as (D,E), so rerooting there changes nothing
  model.rerootAt(idOf(model, ['A', 'B', 'C']))
  expect(model.rowNames).toEqual(['D', 'E', 'C', 'A', 'B'])
  model.rerootAt(idOf(model, ['A']))
  expect(model.treeRoot).toEqual({ outgroup: ['A'] })
  expect(model.rowNames[0]).toBe('A')
})

test('an outgroup straddling the file root roots above the rest', () => {
  // C, D and E hang from one child of the root, so rooting on them only moves
  // the root along the branch the root's two children make
  const model = makeModel({
    treeOrder: 'input',
    treeRoot: { outgroup: ['A', 'B'] },
  })
  expect(model.tree.children.map(c => c.length)).toEqual([2, 2])
  // A and C straddle the root, and so does the rest, so neither side is a
  // branch to root on and the tree stays as written
  const straddling = makeModel({
    treeOrder: 'input',
    treeRoot: { outgroup: ['A', 'C'] },
  })
  expect(straddling.rowNames).toEqual(tips)
  expect(straddling.tree.children.map(c => c.length)).toEqual([3, 1])
})

test('the order and root travel in the snapshot', () => {
  const model = makeModel({ treeOrder: 'ladderize', treeRoot: 'midpoint' })
  const snap = getSnapshot(model) as Record<string, unknown>
  expect(snap.treeOrder).toBe('ladderize')
  expect(snap.treeRoot).toBe('midpoint')
  const plain = getSnapshot(makeModel()) as Record<string, unknown>
  expect(plain.treeOrder).toBeUndefined()
  expect(plain.rotated).toBeUndefined()
})

test('rerooting keeps a support value on the branch it labels', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree: '(((A:1,B:1)95:1,C:1)80:1,D:1,E:1);' },
    treeOrder: 'input',
    treeRoot: { outgroup: ['A'] },
  })
  expect(nodeOf(model, ['C', 'D', 'E']).data.name).toBe('95')
  expect(nodeOf(model, ['D', 'E']).data.name).toBe('80')
  expect(nodeOf(model, ['B', 'C', 'D', 'E']).data.name).toBe(
    nodeOf(model, ['B', 'C', 'D', 'E']).data.id,
  )
})

test("a Stockholm file's own tree reroots without its old ids as labels", () => {
  const stockholm = [
    '# STOCKHOLM 1.0',
    `#=GF NH ${tree}`,
    ...tips.map(name => `${name} MKAA`),
    '//',
  ].join('\n')
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { msa: stockholm },
    treeRoot: 'midpoint',
  })
  const internal = descendants(model.root).filter(n => n.children)
  expect(internal.length).toBeGreaterThan(1)
  for (const node of internal) {
    expect(node.data.name).toBe(node.data.id)
  }
  expect(model.rowNames).toEqual(['D', 'E', 'C', 'A', 'B'])
})

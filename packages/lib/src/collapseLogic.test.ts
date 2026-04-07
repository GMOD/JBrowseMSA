import { describe, expect, test } from 'vitest'

import { collapse, find, hierarchy, leaves, sort, sum } from './hierarchy.ts'

import type { NodeWithIds } from './types.ts'

function buildRoot(tree: NodeWithIds, collapsed: string[], showOnly?: string) {
  let hier = hierarchy(tree, d => d.children)
  sum(hier, d => (d.children.length > 0 ? 0 : 1))
  sort(hier, (a, b) => (a.data.length ?? 1) - (b.data.length ?? 1))

  if (showOnly) {
    const res = find(hier, n => n.data.id === showOnly)
    if (res) {
      hier = res
    }
  }

  for (const collapsedId of collapsed) {
    const node = find(hier, n => n.data.id === collapsedId)
    if (!node) {
      continue
    }
    if (node.children) {
      collapse(node)
    } else if (node.parent?.children) {
      node.parent.children = node.parent.children.filter(
        c => c.data.id !== collapsedId,
      )
    }
  }

  return hier
}

function simpleTree(): NodeWithIds {
  return {
    id: 'root',
    name: 'root',
    children: [
      {
        id: 'clade1',
        name: 'clade1',
        children: [
          { id: 'seq1', name: 'seq1', children: [] },
          { id: 'seq2', name: 'seq2', children: [] },
        ],
      },
      {
        id: 'clade2',
        name: 'clade2',
        children: [
          { id: 'seq3', name: 'seq3', children: [] },
          { id: 'seq4', name: 'seq4', children: [] },
        ],
      },
    ],
  }
}

describe('collapse logic (mirrors model.root getter)', () => {
  test('no collapsed nodes returns all leaves', () => {
    const root = buildRoot(simpleTree(), [])
    expect(leaves(root).map(n => n.data.name)).toEqual([
      'seq1',
      'seq2',
      'seq3',
      'seq4',
    ])
  })

  test('collapsing a branch hides its children', () => {
    const root = buildRoot(simpleTree(), ['clade1'])
    const l = leaves(root).map(n => n.data.name)
    expect(l).toEqual(['clade1', 'seq3', 'seq4'])
  })

  test('collapsing a leaf node removes it', () => {
    const root = buildRoot(simpleTree(), ['seq2'])
    const l = leaves(root).map(n => n.data.name)
    expect(l).toEqual(['seq1', 'seq3', 'seq4'])
  })

  test('collapsing multiple leaves', () => {
    const root = buildRoot(simpleTree(), ['seq1', 'seq4'])
    const l = leaves(root).map(n => n.data.name)
    expect(l).toEqual(['seq2', 'seq3'])
  })

  test('collapsing a branch and a leaf in another branch', () => {
    const root = buildRoot(simpleTree(), ['clade1', 'seq3'])
    const l = leaves(root).map(n => n.data.name)
    expect(l).toEqual(['clade1', 'seq4'])
  })

  test('collapsing nonexistent id is a no-op', () => {
    const root = buildRoot(simpleTree(), ['doesnotexist'])
    expect(leaves(root).map(n => n.data.name)).toEqual([
      'seq1',
      'seq2',
      'seq3',
      'seq4',
    ])
  })

  test('showOnly focuses on a subtree', () => {
    const root = buildRoot(simpleTree(), [], 'clade2')
    expect(leaves(root).map(n => n.data.name)).toEqual(['seq3', 'seq4'])
  })

  test('showOnly + collapse within subtree', () => {
    const root = buildRoot(simpleTree(), ['seq3'], 'clade2')
    expect(leaves(root).map(n => n.data.name)).toEqual(['seq4'])
  })
})

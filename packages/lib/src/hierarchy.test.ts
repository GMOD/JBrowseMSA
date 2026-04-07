import { describe, expect, test } from 'vitest'

import { collapse, find, hierarchy, leaves, sort, sum } from './hierarchy.ts'

import type { NodeWithIds } from './types.ts'

function makeTree(): NodeWithIds {
  return {
    id: 'root',
    name: 'root',
    children: [
      {
        id: 'A',
        name: 'A',
        children: [
          { id: 'A1', name: 'A1', children: [] },
          { id: 'A2', name: 'A2', children: [] },
        ],
      },
      {
        id: 'B',
        name: 'B',
        children: [
          { id: 'B1', name: 'B1', children: [] },
          { id: 'B2', name: 'B2', children: [] },
        ],
      },
    ],
  }
}

describe('hierarchy', () => {
  test('builds hierarchy from tree data', () => {
    const h = hierarchy(makeTree(), d => d.children)
    expect(h.data.id).toBe('root')
    expect(h.children?.length).toBe(2)
    expect(h.height).toBe(2)
  })

  test('sets parent references', () => {
    const h = hierarchy(makeTree(), d => d.children)
    expect(h.parent).toBeNull()
    expect(h.children![0]!.parent).toBe(h)
    expect(h.children![0]!.children![0]!.parent).toBe(h.children![0])
  })
})

describe('leaves', () => {
  test('returns leaf nodes', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const l = leaves(h)
    expect(l.map(n => n.data.name)).toEqual(['A1', 'A2', 'B1', 'B2'])
  })
})

describe('find', () => {
  test('finds node by id', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const node = find(h, n => n.data.id === 'B1')
    expect(node?.data.name).toBe('B1')
  })

  test('returns undefined for missing id', () => {
    const h = hierarchy(makeTree(), d => d.children)
    expect(find(h, n => n.data.id === 'Z')).toBeUndefined()
  })
})

describe('collapse', () => {
  test('hides children of a branch node', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const nodeA = find(h, n => n.data.id === 'A')!
    collapse(nodeA)
    expect(nodeA.children).toBeNull()
    expect(nodeA._children?.length).toBe(2)
    expect(leaves(h).map(n => n.data.name)).toEqual(['A', 'B1', 'B2'])
  })

  test('does nothing on a leaf node', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const leaf = find(h, n => n.data.id === 'A1')!
    collapse(leaf)
    expect(leaves(h).map(n => n.data.name)).toEqual(['A1', 'A2', 'B1', 'B2'])
  })
})

describe('leaf removal via parent.children filter', () => {
  test('removing a leaf from its parent hides it from leaves()', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const leaf = find(h, n => n.data.id === 'A1')!
    leaf.parent!.children = leaf.parent!.children!.filter(
      c => c.data.id !== 'A1',
    )
    expect(leaves(h).map(n => n.data.name)).toEqual(['A2', 'B1', 'B2'])
  })

  test('removing all leaves from a branch makes the branch a leaf', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const nodeA = find(h, n => n.data.id === 'A')!
    nodeA.children = []
    expect(leaves(h).map(n => n.data.name)).toEqual(['B1', 'B2'])
  })
})

describe('sort', () => {
  test('sorts children', () => {
    const h = hierarchy(makeTree(), d => d.children)
    sort(h, (a, b) => b.data.name.localeCompare(a.data.name))
    expect(h.children!.map(c => c.data.name)).toEqual(['B', 'A'])
  })
})

describe('sum', () => {
  test('computes leaf counts', () => {
    const h = hierarchy(makeTree(), d => d.children)
    sum(h, d => (d.children.length > 0 ? 0 : 1))
    expect(h.value).toBe(4)
    expect(find(h, n => n.data.id === 'A')?.value).toBe(2)
  })
})

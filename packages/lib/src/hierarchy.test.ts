import { describe, expect, test } from 'vitest'

import {
  calcDepthToLeaf,
  collapse,
  collapsedSubtreeLengthExtent,
  find,
  findMaxBranchLen,
  hierarchy,
  leaves,
  maxLength,
  setBrLength,
  sort,
  sum,
} from './hierarchy.ts'

import type { NodeWithIds } from './types.ts'

// Builds a fully unbalanced "caterpillar" tree of the given depth: each internal
// node has one leaf child and one internal child. Recursion over this would blow
// the call stack; the iterative traversals must handle it.
function makeDeepTree(depth: number): NodeWithIds {
  let node: NodeWithIds = { id: 'leaf0', name: 'leaf0', children: [] }
  for (let i = 1; i <= depth; i++) {
    node = {
      id: `node${i}`,
      name: `node${i}`,
      length: 1,
      children: [{ id: `leaf${i}`, name: `leaf${i}`, children: [] }, node],
    }
  }
  return node
}

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

  test('preserves the subtree depth so the layout stays stable', () => {
    const h = hierarchy(makeTree(), d => d.children)
    const nodeA = find(h, n => n.data.id === 'A')!
    collapse(nodeA)
    // the collapsed node keeps its real depth (1) rather than becoming a depth-0
    // leaf, so the cladogram apex sits at the true branch point
    expect(nodeA.depthToLeaf).toBe(1)
    // and the root still measures the tree as 2 deep, so collapsing A does not
    // horizontally shift the rest of the tree
    expect(calcDepthToLeaf(h)).toBe(2)
  })
})

describe('collapsedSubtreeLengthExtent', () => {
  // root → A(1) → [ A1(2), C(3) → [ C1(1), C2(10) ] ]
  function makeLenTree(): NodeWithIds {
    return {
      id: 'root',
      name: 'root',
      children: [
        {
          id: 'A',
          name: 'A',
          length: 1,
          children: [
            { id: 'A1', name: 'A1', length: 2, children: [] },
            {
              id: 'C',
              name: 'C',
              length: 3,
              children: [
                { id: 'C1', name: 'C1', length: 1, children: [] },
                { id: 'C2', name: 'C2', length: 10, children: [] },
              ],
            },
          ],
        },
      ],
    }
  }

  test('min/max cumulative branch length to the tips below a node', () => {
    const h = hierarchy(makeLenTree(), d => d.children)
    const nodeA = find(h, n => n.data.id === 'A')!
    collapse(nodeA)
    // excludes A's own branch: nearest tip A1 = 2, farthest tip C2 = 3 + 10 = 13
    expect(collapsedSubtreeLengthExtent(nodeA)).toEqual({ min: 2, max: 13 })
  })

  test('returns zero extent for a node with no descendants', () => {
    const h = hierarchy(makeLenTree(), d => d.children)
    const leaf = find(h, n => n.data.id === 'A1')!
    expect(collapsedSubtreeLengthExtent(leaf)).toEqual({ min: 0, max: 0 })
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

describe('deep (caterpillar) trees do not overflow the stack', () => {
  const depth = 100_000

  test('build, height, leaf count, and ordering', () => {
    const h = hierarchy(makeDeepTree(depth), d => d.children)
    expect(h.height).toBe(depth)
    const l = leaves(h)
    expect(l.length).toBe(depth + 1)
    // each level contributes its own leafN before descending; deepest leaf last
    expect(l[0]!.data.name).toBe(`leaf${depth}`)
    expect(l.at(-1)!.data.name).toBe('leaf0')
  })

  test('accumulation helpers (sum, find, maxLength, setBrLength, depth)', () => {
    const h = hierarchy(makeDeepTree(depth), d => d.children)
    sum(h, d => (d.children.length > 0 ? 0 : 1))
    expect(h.value).toBe(depth + 1)
    expect(find(h, n => n.data.id === 'leaf0')?.data.name).toBe('leaf0')
    expect(maxLength(h)).toBe(depth)
    expect(calcDepthToLeaf(h)).toBe(depth)
    setBrLength(h, 0, 1)
    expect(findMaxBranchLen(h)).toBe(depth)
  })
})

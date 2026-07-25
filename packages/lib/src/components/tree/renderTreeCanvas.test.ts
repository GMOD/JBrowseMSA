import { describe, expect, it } from 'vitest'

import { getNodeX } from './renderTreeCanvas.ts'
import { calcDepthToLeaf, findMaxBranchLen } from '../../hierarchy.ts'

import type { HierarchyNode } from '../../hierarchy.ts'

function leaf(id: string, len?: number): HierarchyNode {
  return {
    data: { id, name: id, children: [] },
    children: null,
    parent: null,
    depth: 0,
    height: 0,
    len,
  }
}

function internal(
  id: string,
  children: HierarchyNode[],
  len?: number,
): HierarchyNode {
  const node: HierarchyNode = {
    data: { id, name: id, children: children.map(c => c.data) },
    children,
    parent: null,
    depth: 0,
    height: 1,
    len,
  }
  for (const child of children) {
    child.parent = node
  }
  return node
}

describe('calcDepthToLeaf', () => {
  it('is 0 for a leaf', () => {
    expect(calcDepthToLeaf(leaf('a'))).toBe(0)
  })

  it('counts steps to the deepest tip', () => {
    const tips = [leaf('a'), leaf('b')]
    const intermediate = internal('int', tips)
    const root = internal('root', [intermediate])

    expect(calcDepthToLeaf(tips[0]!)).toBe(0)
    expect(calcDepthToLeaf(intermediate)).toBe(1)
    expect(calcDepthToLeaf(root)).toBe(2)
  })

  it('memoizes without re-walking the subtree', () => {
    // the renderer asks for every node's depth on every pass, so the memo has to
    // short-circuit the traversal itself, not just the arithmetic. A sentinel
    // planted on an already-computed child must survive a second root call.
    const child = leaf('a')
    const root = internal('root', [child])
    expect(calcDepthToLeaf(root)).toBe(1)

    child.depthToLeaf = 99
    expect(calcDepthToLeaf(root)).toBe(1)
    expect(child.depthToLeaf).toBe(99)
  })
})

describe('findMaxBranchLen', () => {
  it('uses the node itself when it is a leaf', () => {
    expect(findMaxBranchLen(leaf('a', 1.5))).toBe(1.5)
  })

  it('takes the max across descendants', () => {
    expect(
      findMaxBranchLen(internal('p', [leaf('a', 0.5), leaf('b', 1.5)], 0.3)),
    ).toBe(1.5)
  })

  it('treats a missing len as 0', () => {
    expect(findMaxBranchLen(leaf('a'))).toBe(0)
  })
})

describe('getNodeX cladogram positioning', () => {
  it('aligns every tip at the rightmost x', () => {
    const tips = [leaf('a'), leaf('b')]
    calcDepthToLeaf(internal('root', tips))

    const xs = tips.map(tip => getNodeX(tip, false, 100, 1))
    expect(xs).toEqual([100, 100])
  })

  it('puts the root at the leftmost x and internal nodes in between', () => {
    const tips = [leaf('a'), leaf('b')]
    const intermediate = internal('int', tips)
    const root = internal('root', [intermediate])
    calcDepthToLeaf(root)

    const xRoot = getNodeX(root, false, 100, 2)!
    const xInt = getNodeX(intermediate, false, 100, 2)!
    const xTip = getNodeX(tips[0]!, false, 100, 2)!

    expect(xRoot).toBe(0)
    expect(xInt).toBeGreaterThan(xRoot)
    expect(xTip).toBeGreaterThan(xInt)
    expect(xTip).toBe(100)
  })

  it('collapses to the root x when there is no topological depth', () => {
    expect(getNodeX(leaf('a'), false, 100, 0)).toBe(0)
  })

  it('uses branch length in phylogram mode', () => {
    expect(getNodeX(leaf('a', 2.5), true, 100, 1)).toBe(2.5)
  })
})

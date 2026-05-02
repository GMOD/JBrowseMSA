import { describe, it, expect } from 'vitest'
import { hierarchy } from '../../hierarchy.ts'

type NodeWithIds = { id: string; children?: NodeWithIds[]; length?: number }

function calcDepthToLeaf(node: any): number {
  if (node.depthToLeaf !== undefined) {
    return node.depthToLeaf
  }
  if (!node.children || node.children.length === 0) {
    node.depthToLeaf = 0
  } else {
    let maxDepth = 0
    for (const child of node.children) {
      maxDepth = Math.max(maxDepth, 1 + calcDepthToLeaf(child))
    }
    node.depthToLeaf = maxDepth
  }
  return node.depthToLeaf
}

function findMaxBranchLen(node: any): number {
  let maxLen = node.len || 0
  if (node.children) {
    for (const child of node.children) {
      maxLen = Math.max(maxLen, findMaxBranchLen(child))
    }
  }
  return maxLen
}

function getNodeX(
  node: any,
  showBranchLen: boolean,
  maxBranchLen: number,
  maxDepthToLeaf: number,
): number | undefined {
  if (showBranchLen) {
    return node.len
  }
  const depthToLeaf = calcDepthToLeaf(node)
  return ((maxDepthToLeaf - depthToLeaf) / maxDepthToLeaf) * maxBranchLen
}

describe('Tree rendering positioning', () => {
  describe('calcDepthToLeaf', () => {
    it('should return 0 for leaf nodes', () => {
      const leaf = { id: 'leaf', data: { id: 'leaf' }, children: null }
      expect(calcDepthToLeaf(leaf)).toBe(0)
    })

    it('should return 1 for nodes with only leaf children', () => {
      const leaf1 = { id: 'leaf1', data: { id: 'leaf1' }, children: null }
      const leaf2 = { id: 'leaf2', data: { id: 'leaf2' }, children: null }
      const parent = { id: 'parent', data: { id: 'parent' }, children: [leaf1, leaf2] }
      expect(calcDepthToLeaf(parent)).toBe(1)
    })

    it('should return correct depth for nested tree', () => {
      const leaf1 = { id: 'leaf1', data: { id: 'leaf1' }, children: null }
      const leaf2 = { id: 'leaf2', data: { id: 'leaf2' }, children: null }
      const intermediate = { id: 'int', data: { id: 'int' }, children: [leaf1, leaf2] }
      const root = { id: 'root', data: { id: 'root' }, children: [intermediate] }

      expect(calcDepthToLeaf(leaf1)).toBe(0)
      expect(calcDepthToLeaf(intermediate)).toBe(1)
      expect(calcDepthToLeaf(root)).toBe(2)
    })

    it('should cache result', () => {
      const leaf = { id: 'leaf', data: { id: 'leaf' }, children: null }
      const depth1 = calcDepthToLeaf(leaf)
      const depth2 = calcDepthToLeaf(leaf)
      expect(depth1).toBe(depth2)
      expect(leaf.depthToLeaf).toBeDefined()
    })
  })

  describe('findMaxBranchLen', () => {
    it('should return node len for leaf', () => {
      const leaf = { id: 'leaf', data: { id: 'leaf' }, len: 1.5, children: null }
      expect(findMaxBranchLen(leaf)).toBe(1.5)
    })

    it('should return max len from descendants', () => {
      const leaf1 = { id: 'leaf1', data: { id: 'leaf1' }, len: 0.5, children: null }
      const leaf2 = { id: 'leaf2', data: { id: 'leaf2' }, len: 1.5, children: null }
      const parent = { id: 'parent', data: { id: 'parent' }, len: 0.3, children: [leaf1, leaf2] }
      expect(findMaxBranchLen(parent)).toBe(1.5)
    })

    it('should handle undefined len', () => {
      const leaf = { id: 'leaf', data: { id: 'leaf' }, children: null }
      expect(findMaxBranchLen(leaf)).toBe(0)
    })
  })

  describe('getNodeX cladogram positioning', () => {
    it('should position all leaves at rightmost for cladogram', () => {
      const leaf1 = { id: 'leaf1', data: { id: 'leaf1' }, children: null }
      const leaf2 = { id: 'leaf2', data: { id: 'leaf2' }, children: null }
      const root = { id: 'root', data: { id: 'root' }, children: [leaf1, leaf2] }

      calcDepthToLeaf(root)
      const maxBranchLen = 100
      const maxDepthToLeaf = 1

      const x1 = getNodeX(leaf1, false, maxBranchLen, maxDepthToLeaf)
      const x2 = getNodeX(leaf2, false, maxBranchLen, maxDepthToLeaf)

      expect(x1).toBe(maxBranchLen)
      expect(x2).toBe(maxBranchLen)
      expect(x1).toBe(x2)
    })

    it('should position root at leftmost for cladogram', () => {
      const leaf1 = { id: 'leaf1', data: { id: 'leaf1' }, children: null }
      const leaf2 = { id: 'leaf2', data: { id: 'leaf2' }, children: null }
      const root = { id: 'root', data: { id: 'root' }, children: [leaf1, leaf2] }

      calcDepthToLeaf(root)
      const maxBranchLen = 100
      const maxDepthToLeaf = 1

      const xRoot = getNodeX(root, false, maxBranchLen, maxDepthToLeaf)
      expect(xRoot).toBe(0)
    })

    it('should position internal nodes between root and leaves', () => {
      const leaf1 = { id: 'leaf1', data: { id: 'leaf1' }, children: null }
      const leaf2 = { id: 'leaf2', data: { id: 'leaf2' }, children: null }
      const intermediate = { id: 'int', data: { id: 'int' }, children: [leaf1, leaf2] }
      const root = { id: 'root', data: { id: 'root' }, children: [intermediate] }

      calcDepthToLeaf(root)
      const maxBranchLen = 100
      const maxDepthToLeaf = 2

      const xRoot = getNodeX(root, false, maxBranchLen, maxDepthToLeaf)
      const xInt = getNodeX(intermediate, false, maxBranchLen, maxDepthToLeaf)
      const xLeaf = getNodeX(leaf1, false, maxBranchLen, maxDepthToLeaf)

      expect(xRoot).toBe(0)
      expect(xInt).toBeGreaterThan(xRoot)
      expect(xLeaf).toBeGreaterThan(xInt)
      expect(xLeaf).toBe(maxBranchLen)
    })

    it('should use branch length when showBranchLen is true', () => {
      const leaf = { id: 'leaf', data: { id: 'leaf' }, len: 2.5, children: null }
      const x = getNodeX(leaf, true, 100, 1)
      expect(x).toBe(2.5)
    })
  })
})

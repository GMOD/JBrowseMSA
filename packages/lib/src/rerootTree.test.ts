import { parseNewick } from 'msa-parsers'
import { describe, expect, test } from 'vitest'

import { midpointRoot, rerootTree } from './rerootTree.ts'

import type { TreeNode } from './rerootTree.ts'

function write(node: TreeNode): string {
  const name = node.name ?? ''
  const length = node.length === undefined ? '' : `:${+node.length.toFixed(6)}`
  return node.children?.length
    ? `(${node.children.map(write).join(',')})${name}${length}`
    : `${name}${length}`
}

function findNode(root: TreeNode, name: string) {
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.name === name) {
      return node
    }
    stack.push(...(node.children ?? []))
  }
  throw new Error(`no node ${name}`)
}

function tips(node: TreeNode): string[] {
  return node.children?.length ? node.children.flatMap(tips) : [node.name!]
}

// sum of branch lengths between every pair of tips, which a rerooting keeps
function pairDistances(root: TreeNode) {
  const depth = new Map<string, number>()
  const ancestors = new Map<string, TreeNode[]>()
  const stack: [TreeNode, number, TreeNode[]][] = [[root, 0, []]]
  while (stack.length > 0) {
    const [node, d, path] = stack.pop()!
    const here = [...path, node]
    if (node.children?.length) {
      for (const child of node.children) {
        stack.push([child, d + (child.length ?? 0), here])
      }
    } else {
      depth.set(node.name!, d)
      ancestors.set(node.name!, here)
    }
  }
  const depthOf = new Map<TreeNode, number>()
  const walk: [TreeNode, number][] = [[root, 0]]
  while (walk.length > 0) {
    const [node, d] = walk.pop()!
    depthOf.set(node, d)
    for (const child of node.children ?? []) {
      walk.push([child, d + (child.length ?? 0)])
    }
  }
  const names = [...depth.keys()].sort()
  const out: Record<string, number> = {}
  for (const a of names) {
    for (const b of names) {
      if (a < b) {
        const pa = ancestors.get(a)!
        const pb = new Set(ancestors.get(b))
        const lca = pa.findLast(n => pb.has(n))!
        out[`${a}-${b}`] = +(
          depth.get(a)! +
          depth.get(b)! -
          2 * depthOf.get(lca)!
        ).toFixed(6)
      }
    }
  }
  return out
}

describe('rerootTree', () => {
  test('roots in the middle of the branch above a tip', () => {
    const tree = parseNewick('((A:1,B:2):3,C:4,D:5);')
    const out = rerootTree(tree, findNode(tree, 'D'))
    expect(write(out)).toBe('(D:2.5,((A:1,B:2):3,C:4):2.5)')
    expect(pairDistances(out)).toEqual(pairDistances(tree))
  })

  test('turns every node between the target and the old root', () => {
    const tree = parseNewick('(((A:1,B:1):1,C:2):1,(D:1,E:1):2,F:3);')
    const out = rerootTree(tree, findNode(tree, 'A'), 0.25)
    expect(tips(out)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(write(out)).toBe('(A:0.25,(B:1,(C:2,((D:1,E:1):2,F:3):1):1):0.75)')
    expect(pairDistances(out)).toEqual(pairDistances(tree))
  })

  test('drops a two-child root and joins its branches', () => {
    const tree = parseNewick('((A:1,B:1):2,(C:1,D:1):4);')
    const out = rerootTree(tree, findNode(tree, 'A'))
    expect(write(out)).toBe('(A:0.5,(B:1,(C:1,D:1):6):0.5)')
    expect(pairDistances(out)).toEqual(pairDistances(tree))
  })

  test("measures a root child's branch across both halves of the root", () => {
    const tree = parseNewick('((A:1,B:1)X:2,(C:1,D:1)Y:4);')
    const out = rerootTree(tree, findNode(tree, 'X'))
    expect(write(out)).toBe('((A:1,B:1)X:3,(C:1,D:1)Y:3)')
    const past = rerootTree(tree, findNode(tree, 'X'), 5)
    expect(write(past)).toBe('((A:1,B:1)X:5,(C:1,D:1)Y:1)')
  })

  test('moves a support value with the branch it labels', () => {
    // 90 labels the branch between (A,B) and its parent, 70 the one above
    // ((A,B),C)
    const tree = parseNewick('((((A:1,B:1)90:1,C:1)70:1,D:1):1,E:1,F:1);')
    const out = rerootTree(tree, findNode(tree, 'A'))
    // after the turn, the (A,B) node's branch runs down to C's side and the
    // ((A,B),C) branch runs down to D's side, each still labeled
    expect(write(out)).toBe('(A:0.5,(B:1,(C:1,(D:1,(E:1,F:1):1)70:1)90:1):0.5)')
  })

  test('leaves the root alone', () => {
    const tree = parseNewick('(A:1,B:1);')
    expect(rerootTree(tree, tree)).toBe(tree)
  })

  test('keeps a tree without branch lengths free of them', () => {
    const tree = parseNewick('((A,B),C,D);')
    expect(write(rerootTree(tree, findNode(tree, 'C')))).toBe('(C,((A,B),D))')
  })
})

describe('midpointRoot', () => {
  test('roots halfway along the longest tip-to-tip path', () => {
    // the longest path is A to E, 1 + 1 + 1 + 7 = 10, so the root sits 5 from
    // each, 2 up E's branch of 7
    const tree = parseNewick('((A:1,B:1):1,C:1,(D:1,E:7):1);')
    const out = midpointRoot(tree)
    expect(write(out)).toBe('(E:5,(D:1,((A:1,B:1):1,C:1):1):2)')
    expect(pairDistances(out)).toEqual(pairDistances(tree))
  })

  test('finds the midpoint inside the branch the root splits', () => {
    const tree = parseNewick('((A:1,B:1):1,(C:1,D:1):5);')
    expect(write(midpointRoot(tree))).toBe('((C:1,D:1):3,(A:1,B:1):3)')
  })

  test('counts branches when there are no lengths', () => {
    const tree = parseNewick('(A,(B,(C,(D,E))));')
    expect(write(midpointRoot(tree))).toBe('((C,(D,E)),(B,A))')
  })

  test('keeps a caterpillar of 20000 tips off the call stack', () => {
    let newick = 'T0:1'
    for (let i = 1; i < 20000; i++) {
      newick = `(${newick},T${i}:1):1`
    }
    const tree = parseNewick(`${newick};`)
    const out = midpointRoot(tree)
    expect(out.children).toHaveLength(2)
  })
})

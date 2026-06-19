import type { NodeWithIds } from './types.ts'

export interface HierarchyNode<T = NodeWithIds> {
  data: T
  children: HierarchyNode<T>[] | null
  parent: HierarchyNode<T> | null
  depth: number
  height: number
  value?: number
  x?: number
  y?: number
  len?: number
  depthToLeaf?: number
  _children?: HierarchyNode<T>[] | null
}

export interface HierarchyLink<T = NodeWithIds> {
  source: HierarchyNode<T>
  target: HierarchyNode<T>
}

// All traversals below are iterative (explicit stack / reversed-preorder) rather
// than recursive: phylogenetic trees can be deeply unbalanced (a caterpillar tree
// has depth ~= leaf count), which overflows the JS call stack on recursion.

// Pre-order: every parent precedes all of its descendants. Iterating the result
// in reverse therefore yields a valid post-order (children before parents), which
// the accumulation helpers rely on.
export function descendants<T>(node: HierarchyNode<T>): HierarchyNode<T>[] {
  const result: HierarchyNode<T>[] = []
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    result.push(n)
    if (n.children) {
      for (let i = n.children.length - 1; i >= 0; i--) {
        stack.push(n.children[i]!)
      }
    }
  }
  return result
}

function computeHeight<T>(node: HierarchyNode<T>) {
  const nodes = descendants(node)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!
    let h = 0
    if (n.children) {
      for (const child of n.children) {
        if (child.height + 1 > h) {
          h = child.height + 1
        }
      }
    }
    n.height = h
  }
}

export function hierarchy<T>(
  data: T,
  childrenAccessor: (d: T) => T[] | undefined,
): HierarchyNode<T> {
  const root: HierarchyNode<T> = {
    data,
    children: null,
    parent: null,
    depth: 0,
    height: 0,
  }
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    const kids = childrenAccessor(node.data)
    if (kids?.length) {
      node.children = kids.map(d => ({
        data: d,
        children: null,
        parent: node,
        depth: node.depth + 1,
        height: 0,
      }))
      for (const child of node.children) {
        stack.push(child)
      }
    }
  }
  computeHeight(root)
  return root
}

export function sum<T>(
  node: HierarchyNode<T>,
  valueFn: (d: T) => number,
): HierarchyNode<T> {
  const nodes = descendants(node)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!
    let s = valueFn(n.data)
    if (n.children) {
      for (const child of n.children) {
        s += child.value!
      }
    }
    n.value = s
  }
  return node
}

export function sort<T>(
  node: HierarchyNode<T>,
  compareFn: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number,
): HierarchyNode<T> {
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    if (n.children) {
      n.children.sort(compareFn)
      for (const child of n.children) {
        stack.push(child)
      }
    }
  }
  return node
}

export function find<T>(
  node: HierarchyNode<T>,
  predicate: (n: HierarchyNode<T>) => boolean,
): HierarchyNode<T> | undefined {
  const stack = [node]
  let found: HierarchyNode<T> | undefined
  while (stack.length > 0 && found === undefined) {
    const n = stack.pop()!
    if (predicate(n)) {
      found = n
    } else if (n.children) {
      for (let i = n.children.length - 1; i >= 0; i--) {
        stack.push(n.children[i]!)
      }
    }
  }
  return found
}

export function leaves<T>(node: HierarchyNode<T>): HierarchyNode<T>[] {
  const result: HierarchyNode<T>[] = []
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    if (n.children) {
      for (let i = n.children.length - 1; i >= 0; i--) {
        stack.push(n.children[i]!)
      }
    } else {
      result.push(n)
    }
  }
  return result
}

export function links<T>(node: HierarchyNode<T>): HierarchyLink<T>[] {
  const result: HierarchyLink<T>[] = []
  forEachLink(node, (source, target) => {
    result.push({ source, target })
  })
  return result
}

export function forEachLink<T>(
  node: HierarchyNode<T>,
  cb: (source: HierarchyNode<T>, target: HierarchyNode<T>) => void,
) {
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    if (n.children) {
      for (let i = n.children.length - 1; i >= 0; i--) {
        const child = n.children[i]!
        cb(n, child)
        stack.push(child)
      }
    }
  }
}

export function forEachDescendant<T>(
  node: HierarchyNode<T>,
  cb: (n: HierarchyNode<T>) => void,
) {
  for (const n of descendants(node)) {
    cb(n)
  }
}

export function clusterLayout<T>(
  root: HierarchyNode<T>,
  sizeX: number,
  sizeY: number,
) {
  const leafNodes = leaves(root)
  const n = leafNodes.length
  const step = sizeX / n

  for (let i = 0; i < n; i++) {
    leafNodes[i]!.x = (i + 0.5) * step
  }

  // x of an internal node is the mean of its children's x, so process in
  // post-order (children before parents)
  const nodes = descendants(root)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!
    if (node.children) {
      let sum = 0
      for (const child of node.children) {
        sum += child.x!
      }
      node.x = sum / node.children.length
    }
  }

  const rootHeight = root.height
  const stack = [{ node: root, depth: 0 }]
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!
    node.y = rootHeight === 0 ? sizeY : (depth / rootHeight) * sizeY
    if (node.children) {
      for (const child of node.children) {
        stack.push({ node: child, depth: depth + 1 })
      }
    }
  }
}

export function collapse<T>(node: HierarchyNode<T>) {
  if (node.children) {
    node._children = node.children
    node.children = null
  }
}

// Cladogram positioning based on ape's plot.phylo: uses topological depth (max
// steps to a tip) instead of branch length so all leaves align at the rightmost
// x. Memoizes onto node.depthToLeaf since the layout walks the tree repeatedly.
// See https://github.com/emmanuelparadis/ape/blob/master/R/plot.phylo.R
export function calcDepthToLeaf(node: HierarchyNode): number {
  const nodes = descendants(node)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!
    if (n.depthToLeaf === undefined) {
      let maxDepth = 0
      if (n.children) {
        for (const child of n.children) {
          maxDepth = Math.max(maxDepth, 1 + child.depthToLeaf!)
        }
      }
      n.depthToLeaf = maxDepth
    }
  }
  return node.depthToLeaf!
}

export function findMaxBranchLen(node: HierarchyNode): number {
  let maxLen = 0
  for (const n of descendants(node)) {
    maxLen = Math.max(maxLen, n.len || 0)
  }
  return maxLen
}

// Max root-to-leaf sum of branch lengths within the subtree at d
export function maxLength(d: HierarchyNode): number {
  const nodes = descendants(d)
  const pathLen = new Map<HierarchyNode, number>()
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!
    let childMax = 0
    if (n.children) {
      for (const child of n.children) {
        childMax = Math.max(childMax, pathLen.get(child)!)
      }
    }
    pathLen.set(n, (n.data.length || 0) + childMax)
  }
  return pathLen.get(d)!
}

export function setBrLength(d: HierarchyNode, y0: number, k: number) {
  const stack = [{ node: d, y0 }]
  while (stack.length > 0) {
    const { node, y0: acc } = stack.pop()!
    const next = acc + Math.max(node.data.length || 0, 0)
    node.len = next * k
    if (node.children) {
      for (const child of node.children) {
        stack.push({ node: child, y0: next })
      }
    }
  }
}

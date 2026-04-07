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
  _children?: HierarchyNode<T>[] | null
}

export interface HierarchyLink<T = NodeWithIds> {
  source: HierarchyNode<T>
  target: HierarchyNode<T>
}

function computeHeight<T>(node: HierarchyNode<T>): number {
  let h = 0
  if (node.children) {
    for (const child of node.children) {
      const ch = computeHeight(child) + 1
      if (ch > h) {
        h = ch
      }
    }
  }
  node.height = h
  return h
}

function wrap<T>(
  data: T,
  childrenAccessor: (d: T) => T[] | undefined,
  parent: HierarchyNode<T> | null,
  depth: number,
): HierarchyNode<T> {
  const kids = childrenAccessor(data)
  const node: HierarchyNode<T> = {
    data,
    children: null,
    parent,
    depth,
    height: 0,
  }
  if (kids?.length) {
    node.children = kids.map(d => wrap(d, childrenAccessor, node, depth + 1))
  }
  return node
}

export function hierarchy<T>(
  data: T,
  childrenAccessor: (d: T) => T[] | undefined,
): HierarchyNode<T> {
  const root = wrap(data, childrenAccessor, null, 0)
  computeHeight(root)
  return root
}

export function sum<T>(
  node: HierarchyNode<T>,
  valueFn: (d: T) => number,
): HierarchyNode<T> {
  function visit(n: HierarchyNode<T>): number {
    let s = valueFn(n.data)
    if (n.children) {
      for (const child of n.children) {
        s += visit(child)
      }
    }
    n.value = s
    return s
  }
  visit(node)
  return node
}

export function sort<T>(
  node: HierarchyNode<T>,
  compareFn: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number,
): HierarchyNode<T> {
  function visit(n: HierarchyNode<T>) {
    if (n.children) {
      n.children.sort(compareFn)
      for (const child of n.children) {
        visit(child)
      }
    }
  }
  visit(node)
  return node
}

export function find<T>(
  node: HierarchyNode<T>,
  predicate: (n: HierarchyNode<T>) => boolean,
): HierarchyNode<T> | undefined {
  if (predicate(node)) {
    return node
  }
  if (node.children) {
    for (const child of node.children) {
      const result = find(child, predicate)
      if (result) {
        return result
      }
    }
  }
  return undefined
}

export function leaves<T>(node: HierarchyNode<T>): HierarchyNode<T>[] {
  const result: HierarchyNode<T>[] = []
  function visit(n: HierarchyNode<T>) {
    if (n.children) {
      for (const child of n.children) {
        visit(child)
      }
    } else {
      result.push(n)
    }
  }
  visit(node)
  return result
}

export function descendants<T>(node: HierarchyNode<T>): HierarchyNode<T>[] {
  const result: HierarchyNode<T>[] = []
  function visit(n: HierarchyNode<T>) {
    result.push(n)
    if (n.children) {
      for (const child of n.children) {
        visit(child)
      }
    }
  }
  visit(node)
  return result
}

export function links<T>(node: HierarchyNode<T>): HierarchyLink<T>[] {
  const result: HierarchyLink<T>[] = []
  function visit(n: HierarchyNode<T>) {
    if (n.children) {
      for (const child of n.children) {
        result.push({ source: n, target: child })
        visit(child)
      }
    }
  }
  visit(node)
  return result
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

  function assignX(node: HierarchyNode<T>) {
    if (!node.children) {
      return
    }
    for (const child of node.children) {
      assignX(child)
    }
    let sum = 0
    for (const child of node.children) {
      sum += child.x!
    }
    node.x = sum / node.children.length
  }
  assignX(root)

  const rootHeight = root.height
  function assignY(node: HierarchyNode<T>, depth: number) {
    node.y = rootHeight === 0 ? sizeY : (depth / rootHeight) * sizeY
    if (node.children) {
      for (const child of node.children) {
        assignY(child, depth + 1)
      }
    }
  }
  assignY(root, 0)
}

export function collapse<T>(node: HierarchyNode<T>) {
  if (node.children) {
    node._children = node.children
    node.children = null
  }
}

export function maxLength(d: HierarchyNode): number {
  return (
    (d.data.length || 0) +
    (d.children ? d.children.reduce((m, c) => Math.max(m, maxLength(c)), 0) : 0)
  )
}

export function setBrLength(d: HierarchyNode, y0: number, k: number) {
  d.len = (y0 += Math.max(d.data.length || 0, 0)) * k
  if (d.children) {
    for (const child of d.children) {
      setBrLength(child, y0, k)
    }
  }
}

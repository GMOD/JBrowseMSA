import {
  descendants,
  find,
  forEachDescendant,
  forEachLink,
  hierarchy as coreHierarchy,
  leaves,
  links,
  sort,
  sum,
} from '@gmod/newick'

import type { NodeWithIds } from './types.ts'
import type { HierarchyNode as CoreHierarchyNode } from '@gmod/newick'

/**
 * A hierarchy node plus the fields this viewer hangs off it during layout.
 *
 * The traversals in `@gmod/newick` are generic over the node type rather than
 * over its data, so they take and return this extended node rather than the base
 * one, and no call site has to cast.
 */
export interface HierarchyNode<T = NodeWithIds> extends CoreHierarchyNode<T> {
  children: HierarchyNode<T>[] | null
  parent: HierarchyNode<T> | null
  x?: number
  y?: number
  // the span of `x` over this node's subtree, set by clusterLayout. Leaves are
  // laid out in order, so a subtree occupies one contiguous run of rows and a
  // renderer can skip the whole thing when the run misses its block.
  xMin?: number
  xMax?: number
  len?: number
  depthToLeaf?: number
  _children?: HierarchyNode<T>[] | null
  // pixel x-position of the farthest tip of a collapsed subtree, where the base
  // of the collapsed-clade triangle goes. Set in the model's hierarchy getter.
  collapsedTipXFar?: number
}

// The @gmod/newick traversals are iterative: a caterpillar tree's depth equals
// its leaf count, and recursion overflows the stack past about 5000 tips.
export {
  descendants,
  find,
  forEachDescendant,
  forEachLink,
  leaves,
  links,
  sort,
  sum,
}
export type { HierarchyLink } from '@gmod/newick'

// declares the wider return type so the layout code can assign the optional
// fields above onto coreHierarchy's nodes
export function hierarchy<T>(
  data: T,
  childrenAccessor: (d: T) => T[] | undefined,
): HierarchyNode<T> {
  return coreHierarchy(data, childrenAccessor)
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
  // post-order (children before parents). The subtree span comes from the same
  // pass, for the block culls in the tree renderer.
  const nodes = descendants(root)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!
    if (node.children) {
      let sum = 0
      let min = Infinity
      let max = -Infinity
      for (const child of node.children) {
        sum += child.x!
        min = Math.min(min, child.xMin!)
        max = Math.max(max, child.xMax!)
      }
      node.x = sum / node.children.length
      node.xMin = min
      node.xMax = max
    } else {
      node.xMin = node.x
      node.xMax = node.x
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
    // memoize the real subtree depth onto the node before detaching its
    // children, so cladogram positioning keeps the node (now the apex of a
    // collapsed-clade triangle) at its true branch point rather than snapping
    // it to the tip-alignment line. This also keeps the rest of the tree's
    // horizontal layout stable when a clade is collapsed.
    calcDepthToLeaf(node)
    node._children = node.children
    node.children = null
  }
}

// Cumulative raw branch length from a collapsed node down to the farthest tip of
// its detached subtree (excludes the node's own branch). Sizes the base of the
// collapsed-clade triangle in phylogram mode.
export function collapsedSubtreeMaxLength<T extends { length?: number }>(
  node: HierarchyNode<T>,
) {
  const roots = node._children ?? node.children
  let max = 0
  if (roots) {
    const stack = roots.map(child => ({
      node: child,
      acc: Math.max(child.data.length ?? 0, 0),
    }))
    while (stack.length > 0) {
      const { node: n, acc } = stack.pop()!
      const kids = n.children ?? n._children
      if (kids?.length) {
        for (const child of kids) {
          stack.push({
            node: child,
            acc: acc + Math.max(child.data.length ?? 0, 0),
          })
        }
      } else {
        max = Math.max(max, acc)
      }
    }
  }
  return max
}

// Cladogram positioning based on ape's plot.phylo: uses topological depth (max
// steps to a tip) instead of branch length so all leaves align at the rightmost
// x. Memoizes onto node.depthToLeaf since the layout walks the tree repeatedly.
// See https://github.com/emmanuelparadis/ape/blob/master/R/plot.phylo.R
export function calcDepthToLeaf<T>(node: HierarchyNode<T>): number {
  // the memo check has to guard the traversal, not just the arithmetic: the tree
  // renderer asks for the depth of every node on every pass, and re-walking each
  // subtree makes that quadratic (a 5000-tip caterpillar tree spent >1s per draw
  // here). Once a node is memoized so are all of its descendants.
  if (node.depthToLeaf === undefined) {
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
  }
  return node.depthToLeaf!
}

// Max root-to-leaf sum of branch lengths within the subtree at d. Negative
// lengths are floored at zero, the same as setBrLength does when it lays the
// tree out, so the extent this reports is the one that gets drawn
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
    pathLen.set(n, Math.max(n.data.length || 0, 0) + childMax)
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

/**
 * Every leaf by name, with a name two leaves share mapping to undefined: a tip
 * set naming it cannot say which tip it means.
 */
export function leafIndex<T extends { name: string }>(root: HierarchyNode<T>) {
  const index = new Map<string, HierarchyNode<T> | undefined>()
  for (const leaf of leaves(root)) {
    const { name } = leaf.data
    index.set(name, index.has(name) ? undefined : leaf)
  }
  return index
}

/**
 * The most recent common ancestor of a set of tip names, or undefined when a
 * name is not a tip of this tree or names two of them.
 *
 * Each name lifts through `parent` to the ancestor the names before it share,
 * so the walk holds two nodes. Recording a root-to-tip path per name instead
 * costs the depth in memory per name, and a caterpillar tree's depth is its tip
 * count. `index` is `leafIndex(root)`, which a caller resolving several tip
 * sets against one tree builds once.
 */
export function mrca<T extends { name: string }>(
  root: HierarchyNode<T>,
  names: string[],
  index = leafIndex(root),
) {
  let node: HierarchyNode<T> | undefined
  for (const name of names) {
    let other = index.get(name)
    if (!other) {
      return undefined
    }
    if (!node) {
      node = other
      continue
    }
    while (node.depth > other.depth) {
      node = node.parent!
    }
    while (other.depth > node.depth) {
      other = other.parent!
    }
    while (node !== other) {
      node = node.parent!
      other = other.parent!
    }
  }
  return node
}

/**
 * The deepest node whose subtree covers a run of rows, given in the row-space
 * coordinates clusterLayout writes to xMin/xMax. A subtree's leaves are one
 * contiguous run, so at most one child per level covers the run and the descent
 * visits the tree's depth rather than its nodes.
 */
export function nodeCoveringRows<T>(
  root: HierarchyNode<T>,
  top: number,
  bottom: number,
) {
  let node = root
  for (;;) {
    const child = node.children?.find(c => c.xMin! <= top && c.xMax! >= bottom)
    if (!child) {
      return node
    }
    node = child
  }
}

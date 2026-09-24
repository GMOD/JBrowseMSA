/**
 * Rerooting over the plain node `parseNewick` produces, the shape
 * `@gmod/newick` and jbrowse-components' tree sidebar share, so these can move
 * into that package unchanged.
 *
 * Every traversal is iterative, for the reason the ones in `@gmod/newick` are: a
 * caterpillar tree is as deep as it has leaves, and recursion overflows the
 * stack past about 5000 of them.
 */
export interface TreeNode {
  name?: string
  length?: number
  children?: TreeNode[]
}

function preorder<N extends TreeNode>(root: N) {
  const order: N[] = []
  const parents = new Map<N, N>()
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    order.push(node)
    for (const child of (node.children ?? []) as N[]) {
      parents.set(child, node)
      stack.push(child)
    }
  }
  return { order, parents }
}

function hasLengths(order: TreeNode[]) {
  return order.some(n => n.length !== undefined)
}

// the root's two children make one branch of the unrooted tree, which is the
// branch a rerooting at either of them splits
function mergedSibling<N extends TreeNode>(root: N, target: N) {
  return root.children?.length === 2
    ? (root.children.find(c => c !== target) as N | undefined)
    : undefined
}

/**
 * The tree rooted on the branch above `target`, `offset` up from it, or at the
 * middle of that branch without one. Where the root has two children, their
 * branches are one branch of the unrooted tree, and `offset` runs across both.
 *
 * The nodes between `target` and the old root turn over. A name on one of them
 * labels the branch above it, which is where a support value sits, so the name
 * follows that branch to the node now at its lower end. A two-child root has
 * nothing left to split once one child leaves, so it drops out and its
 * branches join.
 */
export function rerootTree<N extends TreeNode>(
  root: N,
  target: N,
  offset?: number,
): TreeNode {
  const { order, parents } = preorder(root)
  if (!parents.has(target)) {
    return root
  }
  const lengths = hasLengths(order)
  const sibling =
    parents.get(target) === root ? mergedSibling(root, target) : undefined
  const branch = (target.length ?? 0) + (sibling?.length ?? 0)
  const at = Math.min(Math.max(offset ?? branch / 2, 0), branch)
  const length = (n: number) => (lengths ? n : undefined)

  const path = [target]
  for (let n = parents.get(target); n; n = parents.get(n)) {
    path.push(n)
  }
  // Built from the old root down, so the node each turned node now hangs
  // `above` it already exists. undefined where the old root dropped out.
  let above: TreeNode | undefined
  for (let i = path.length - 1; i >= 1; i--) {
    const node = path[i]!
    const below = path[i - 1]!
    const children = node.children!.filter(c => c !== below)
    if (above) {
      children.push(above)
    }
    if (children.length === 0) {
      above = undefined
    } else if (i === path.length - 1 && children.length === 1) {
      const only = children[0]!
      above = {
        ...only,
        length: length(
          (only.length ?? 0) + (below.length ?? 0) - (i === 1 ? at : 0),
        ),
      }
    } else {
      above = {
        ...node,
        name: i === 1 ? undefined : below.name,
        children,
        length: length((below.length ?? 0) - (i === 1 ? at : 0)),
      }
    }
  }
  return {
    children: [{ ...target, length: length(at) }, ...(above ? [above] : [])],
  }
}

/**
 * The tree rooted halfway along the longest path between two tips, which is
 * where a clock would put the root: the usual choice for the unrooted tree
 * FastTree, IQ-TREE or neighbor joining writes. A tree with no branch lengths
 * counts branches.
 */
export function midpointRoot<N extends TreeNode>(root: N): TreeNode {
  const { order, parents } = preorder(root)
  const tips = order.filter(n => !n.children?.length)
  if (tips.length < 2) {
    return root
  }
  const lengths = hasLengths(order)
  const weight = (n: N) => (lengths ? (n.length ?? 0) : 1)

  // distance from `from` to every node over the unrooted tree, and the
  // neighbor each was reached through
  function reach(from: N) {
    const dist = new Map<N, number>([[from, 0]])
    const via = new Map<N, N>()
    const stack = [from]
    while (stack.length > 0) {
      const node = stack.pop()!
      const d = dist.get(node)!
      const parent = parents.get(node)
      if (parent && !dist.has(parent)) {
        dist.set(parent, d + weight(node))
        via.set(parent, node)
        stack.push(parent)
      }
      for (const child of (node.children ?? []) as N[]) {
        if (!dist.has(child)) {
          dist.set(child, d + weight(child))
          via.set(child, node)
          stack.push(child)
        }
      }
    }
    return { dist, via }
  }
  function farthest(dist: Map<N, number>) {
    return tips.reduce((best, tip) =>
      dist.get(tip)! > dist.get(best)! ? tip : best,
    )
  }

  const a = farthest(reach(tips[0]!).dist)
  const { dist, via } = reach(a)
  const b = farthest(dist)
  if (b === a) {
    return root
  }
  const half = dist.get(b)! / 2
  let node = b
  let next = via.get(node)!
  while (dist.get(next)! > half) {
    node = next
    next = via.get(node)!
  }
  // the midpoint lies on the branch between `node` and `next`, and whichever
  // of them is the child carries that branch
  return parents.get(node) === next
    ? rerootTree(root, node, dist.get(node)! - half)
    : rerootTree(root, next, half - dist.get(next)!)
}

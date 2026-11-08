import { generateNodeIds, isEmf, parseEmfTree, parseNewick } from 'msa-parsers'

import { cladeHighlightAlpha, cladeHighlightColor } from './constants.ts'
import { flatToTree } from './flatToTree.ts'
import {
  collapse,
  find,
  forEachDescendant,
  hierarchy,
  leafIndex,
  leaves,
  mrca,
  sort,
  sum as hierarchySum,
} from './hierarchy.ts'
import { parseAsn1 } from './parseAsn1.ts'
import { midpointRoot, preorder, rerootTree } from './rerootTree.ts'
import { withAlpha } from './util.ts'

import type { HierarchyNode } from './hierarchy.ts'
import type { TreeNode } from './rerootTree.ts'
import type {
  Clade,
  CladeMark,
  NodeWithIds,
  ResolvedClade,
  TreeOrder,
  TreeRoot,
} from './types.ts'

export function parseTreeText(text: string) {
  if (text.startsWith('BioTreeContainer')) {
    return flatToTree(parseAsn1(text))
  }
  return parseNewick(isEmf(text) ? parseEmfTree(text).tree : text)
}

// the marks that set tree state from a node rather than drawing
export const seedingMarks = new Set<CladeMark>(['collapse', 'focus', 'rotate'])

function pushReversed(stack: HierarchyNode[], nodes: HierarchyNode[]) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push(nodes[i]!)
  }
}

/**
 * Each tip of the full tree in the order the tree draws it, with the on-screen
 * row that shows it: its own, or the row of the collapsed node standing for it
 */
function tipRows(root: HierarchyNode) {
  const rows = new Map<string, { order: number; row: number }>()
  let row = 0
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.children?.length) {
      pushReversed(stack, node.children)
    } else {
      const hidden = [node]
      while (hidden.length > 0) {
        const tip = hidden.pop()!
        const kids = tip.children ?? tip._children
        if (kids?.length) {
          pushReversed(hidden, kids)
        } else {
          rows.set(tip.data.name, { order: rows.size, row })
        }
      }
      row++
    }
  }
  return rows
}

/**
 * The rows a clade covers and the node an `mrca` names, or undefined when the
 * clade does not resolve: a tip name the tree does not have or has twice, or a
 * leaf count `tips` disagrees with. A `range` counts its tips in the order
 * `tips` gives them, so a collapsed clade inside it counts every leaf it
 * stands for. `index` is the memoized leaf pass over the tree.
 */
function cladeRows(
  clade: Clade,
  root: HierarchyNode,
  index: Map<string, HierarchyNode | undefined>,
  tips: Map<string, { order: number; row: number }>,
): { rows: [number, number]; nodeId?: string } | undefined {
  if (clade.range) {
    const [a, b] = clade.range.map(name =>
      index.get(name) ? tips.get(name) : undefined,
    )
    if (a === undefined || b === undefined) {
      return undefined
    }
    const [first, last] = a.order <= b.order ? [a, b] : [b, a]
    return last.order - first.order + 1 === clade.tips
      ? { rows: [first.row, last.row] }
      : undefined
  }
  const node = clade.mrca ? mrca(root, clade.mrca, index) : undefined
  if (!node) {
    return undefined
  }
  const nodeTips = leaves(node)
  if (nodeTips.length !== clade.tips) {
    return undefined
  }
  let first = Infinity
  let last = -Infinity
  for (const tip of nodeTips) {
    const row = tips.get(tip.data.name)?.row
    if (row !== undefined) {
      first = Math.min(first, row)
      last = Math.max(last, row)
    }
  }
  return first <= last
    ? { rows: [first, last], nodeId: node.data.id }
    : undefined
}

/**
 * Every clade that resolves, with its fill color settled, against the rows of
 * `displayed`, the tree as drawn. The tree panel resolves against the
 * displayed rows and the overview against its own, so both take the tree they
 * draw. A `range` record names no node, so the seeding marks, which need one,
 * drop it.
 */
export function resolveClades(
  clades: Clade[],
  root: HierarchyNode,
  displayed: HierarchyNode,
): ResolvedClade[] {
  const index = leafIndex(root)
  const tips = tipRows(displayed)
  return clades.flatMap(clade => {
    const resolved = cladeRows(clade, root, index, tips)
    const seeding = seedingMarks.has(clade.mark)
    return resolved && !(seeding && resolved.nodeId === undefined)
      ? [
          {
            ...resolved,
            mark: clade.mark,
            color: withAlpha(
              clade.color ?? cladeHighlightColor,
              cladeHighlightAlpha,
            ),
            markColor: clade.color,
            label: clade.label,
          },
        ]
      : []
  })
}

const childOrders: Record<
  TreeOrder,
  ((a: HierarchyNode, b: HierarchyNode) => number) | undefined
> = {
  input: undefined,
  branchLength: (a, b) => (a.data.length ?? 1) - (b.data.length ?? 1),
  ladderize: (a, b) => a.value! - b.value!,
  ladderizeReverse: (a, b) => b.value! - a.value!,
}

/**
 * The tree with the display transforms applied: leaf counts summed, children
 * put in `order` and each `rotated` node's reversed, `showOnly` taken as the
 * new root, and each `collapsed` clade folded. The overview builds the same
 * tree without the focus, so it shows the focused subtree inside the whole.
 */
export function buildTreeRoot(
  tree: NodeWithIds,
  {
    collapsed,
    rotated,
    order,
    showOnly,
  }: {
    collapsed: readonly string[]
    rotated: readonly string[]
    order: TreeOrder
    showOnly?: string
  },
) {
  let hier = hierarchy(tree, d => d.children)
  hierarchySum(hier, d => (d.children.length > 0 ? 0 : 1))
  const compare = childOrders[order]
  if (compare) {
    sort(hier, compare)
  }
  if (rotated.length > 0) {
    const flip = new Set(rotated)
    forEachDescendant(hier, n => {
      if (flip.has(n.data.id)) {
        n.children?.reverse()
      }
    })
  }

  if (showOnly) {
    const res = find(hier, n => n.data.id === showOnly)
    if (res) {
      hier = res
    }
  }

  for (const collapsedId of collapsed) {
    const node = find(hier, n => n.data.id === collapsedId)
    if (node) {
      if (node.children) {
        collapse(node)
      } else if (node.parent?.children) {
        node.parent.children = node.parent.children.filter(
          c => c.data.id !== collapsedId,
        )
      }
    }
  }

  return hier
}

/**
 * The node whose branch an outgroup roots the tree on: the outgroup's most
 * recent common ancestor, or the rest of the tips' where that ancestor is the
 * root, since the outgroup then straddles the root and the branch above the
 * other side is the same branch of the unrooted tree.
 */
export function outgroupNode(root: HierarchyNode, outgroup: string[]) {
  const index = leafIndex(root)
  const node = mrca(root, outgroup, index)
  if (node !== root) {
    return node
  }
  const out = new Set(outgroup)
  const rest = leaves(root)
    .map(n => n.data.name)
    .filter(name => !out.has(name))
  const other = mrca(root, rest, index)
  return other === root ? undefined : other
}

/**
 * `tree` rerooted as `treeRoot` asks, with fresh path ids. The ids of the tree
 * as written become names on unnamed nodes, and a rerooting would carry them
 * along as labels, so they come off first.
 */
export function rootTree(tree: NodeWithIds, treeRoot: TreeRoot) {
  const plain = new Map<NodeWithIds, TreeNode>()
  for (const node of preorder(tree).toReversed()) {
    plain.set(node, {
      name: node.name === node.id ? undefined : node.name,
      length: node.length,
      children: node.children.map(c => plain.get(c)!),
    })
  }
  const input = plain.get(tree)!
  if (treeRoot === 'midpoint') {
    return generateNodeIds(midpointRoot(input))
  }
  const target = outgroupNode(
    hierarchy(tree, d => d.children),
    treeRoot.outgroup,
  )
  return target
    ? generateNodeIds(rerootTree(input, plain.get(target.data)!))
    : tree
}

// the inclusive tip indices a node covers, from its xMin/xMax in a layout one
// row per tip
export function tipRange(node: HierarchyNode): [number, number] {
  return [Math.round(node.xMin! - 0.5), Math.round(node.xMax! - 0.5)]
}

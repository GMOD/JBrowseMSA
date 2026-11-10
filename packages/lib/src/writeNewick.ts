import { writeNewick as writeNewickNode } from '@gmod/newick'

import { descendants } from './hierarchy.ts'

import type { HierarchyNode } from './hierarchy.ts'
import type { NewickNode } from '@gmod/newick'

/**
 * The tree as Newick, in the order it is drawn. An internal node whose name is
 * only its generated id goes unnamed.
 */
export function writeNewick(root: HierarchyNode) {
  const plain = new Map<HierarchyNode, NewickNode>()
  for (const node of descendants(root).toReversed()) {
    const { id, name, length } = node.data
    plain.set(node, {
      name: node.children && name === id ? undefined : name,
      length,
      children: node.children?.map(c => plain.get(c)!),
    })
  }
  return writeNewickNode(plain.get(root)!)
}

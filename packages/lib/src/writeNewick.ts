import { descendants } from './hierarchy.ts'

import type { HierarchyNode } from './hierarchy.ts'

// a name holding any of these reads back as grammar unless it is quoted
const needsQuotes = /[\s(),:;[\]']/

function quote(name: string) {
  return needsQuotes.test(name) ? `'${name.replaceAll("'", "''")}'` : name
}

/**
 * The tree as Newick, in the order it is drawn. An internal node whose name is
 * only its generated id goes unnamed. Each subtree's string is dropped once its
 * parent takes it in, since a caterpillar tree is as deep as it has tips and
 * keeping every one is quadratic.
 */
export function writeNewick(root: HierarchyNode) {
  const written = new Map<HierarchyNode, string>()
  for (const node of descendants(root).reverse()) {
    const { id, name, length } = node.data
    let text = ''
    if (node.children) {
      text = `(${node.children.map(c => written.get(c)!).join(',')})`
      for (const child of node.children) {
        written.delete(child)
      }
    }
    if (!(node.children && name === id)) {
      text += quote(name)
    }
    if (length !== undefined) {
      text += `:${length}`
    }
    written.set(node, text)
  }
  return `${written.get(root)!};`
}

import type { NodeWithIds } from './types.ts'

// this reparse routine helps to allow the app to hide/collapse a single
// leafnode
export function reparseTree(tree: NodeWithIds): NodeWithIds {
  return {
    ...tree,
    children: tree.children.map(r =>
      r.children.length
        ? reparseTree(r)
        : {
            children: [r],
            id: `${r.id}-leafnode`,
            name: `${r.name}-hidden`,
          },
    ),
  }
}

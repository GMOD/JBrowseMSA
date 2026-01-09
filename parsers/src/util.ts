import type { Node, NodeWithIds } from './types'

export function generateNodeIds(
  tree: Node,
  parent = 'node',
  depth = 0,
): NodeWithIds {
  const id = `${parent}-${depth}`

  return {
    ...tree,
    id,
    name: tree.name || id,
    children:
      tree.children?.map((b, i) =>
        generateNodeIds(b, `${id}-${i}`, depth + 1),
      ) || [],
  }
}

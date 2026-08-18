import type { Node, NodeWithIds } from './types.ts'

/**
 * Copy a parsed tree, giving every node a stable id derived from its path, and
 * falling back to that id for an unnamed node.
 *
 * Iterative, like the traversals in @gmod/newick and the Newick emitter in the
 * viewer's neighbor joining: a phylogeny can be a caterpillar whose depth equals
 * its leaf count, and the recursive form of this overflowed the stack somewhere
 * past 5000 deep -- which every tree reaches, since this is the last step of
 * parsing one.
 */
export function generateNodeIds(
  tree: Node,
  parent = 'node',
  depth = 0,
): NodeWithIds {
  const withId = (node: Node, id: string): NodeWithIds => ({
    ...node,
    id,
    name: node.name || id,
    children: [],
  })

  const root = withId(tree, `${parent}-${depth}`)
  const stack = [{ src: tree, out: root, depth }]
  while (stack.length > 0) {
    const { src, out, depth: d } = stack.pop()!
    if (src.children) {
      out.children = src.children.map((child, i) =>
        withId(child, `${out.id}-${i}-${d + 1}`),
      )
      for (const [i, child] of src.children.entries()) {
        stack.push({ src: child, out: out.children[i]!, depth: d + 1 })
      }
    }
  }
  return root
}

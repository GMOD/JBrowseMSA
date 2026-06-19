interface FlatItem {
  id: number
  parent?: number
}

interface TreeNode {
  id: string
  name: string
  parent?: string
  children: TreeNode[]
}

export function flatToTree(items: FlatItem[]): TreeNode {
  const nodeMap = new Map(
    items.map(item => [
      item.id,
      {
        id: `${item.id}`,
        name: `${item.id}`,
        parent: item.parent !== undefined ? `${item.parent}` : undefined,
        children: [] as TreeNode[],
      },
    ]),
  )

  let root: TreeNode | undefined
  for (const item of items) {
    const node = nodeMap.get(item.id)!
    const parent =
      item.parent !== undefined ? nodeMap.get(item.parent) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      root ??= node
    }
  }

  if (root === undefined) {
    // no node lacks a (resolvable) parent: empty input, or every node's parent
    // points back into the set (a cycle). returning undefined here would crash
    // cryptically downstream, so fail with a diagnosable message instead
    throw new Error(
      'could not build tree from flat node list: no root found (input was empty or contains a parent cycle)',
    )
  }

  return root
}

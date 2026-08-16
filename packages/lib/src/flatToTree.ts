interface FlatItem {
  id: number
  parent?: number
  // NCBI BioTreeContainer features, already un-remapped by parseAsn1. Both are
  // strings there: the ASN.1 encodes every feature value as one.
  label?: string
  dist?: string
}

interface TreeNode {
  id: string
  name: string
  length?: number
  children: TreeNode[]
}

export function flatToTree(items: FlatItem[]): TreeNode {
  const nodeMap = new Map(
    items.map(item => {
      const length = item.dist === undefined ? undefined : Number(item.dist)
      return [
        item.id,
        {
          id: `${item.id}`,
          // the label is what NCBI's own tree viewer shows; falling back to the
          // node id would render a tree of bare numbers
          name: item.label || `${item.id}`,
          ...(length !== undefined && Number.isFinite(length)
            ? { length }
            : {}),
          children: [] as TreeNode[],
        },
      ]
    }),
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

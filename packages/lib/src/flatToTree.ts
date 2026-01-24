// Define the input item interface
interface FlatItem {
  id: number
  parent?: number
}

// Define the tree node interface
interface TreeNode {
  id: string
  name: string
  parent?: string
  children: TreeNode[]
}

/**
 * Parses a flat list of items into a tree structure
 * @param items - Array of flat items with id and optional parent
 * @returns Array of root tree nodes
 */
export function flatToTree(items: FlatItem[]): TreeNode {
  // Create a map to store all nodes by their id for quick lookup
  const nodeMap = new Map<number, TreeNode>()

  // First pass: Create all tree nodes
  items.forEach(item => {
    nodeMap.set(item.id, {
      ...item,
      id: `${item.id}`,
      name: `${item.id}`,
      parent: item.parent !== undefined ? `${item.parent}` : undefined,
      children: [],
    })
  })

  // Second pass: Build parent-child relationships
  const roots: TreeNode[] = []

  items.forEach(item => {
    const node = nodeMap.get(item.id)!

    if (item.parent !== undefined) {
      // This item has a parent, add it to parent's children
      const parentNode = nodeMap.get(item.parent)
      if (parentNode) {
        parentNode.children.push(node)
      } else {
        // Parent doesn't exist, treat as root
        roots.push(node)
      }
    } else {
      // This item has no parent, it's a root node
      roots.push(node)
    }
  })

  return roots[0]!
}

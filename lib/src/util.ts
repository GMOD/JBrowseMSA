import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'
import { max } from 'd3-array'

import type { Node, NodeWithIds } from './types'
import type { Theme } from '@mui/material'
import type { HierarchyNode } from 'd3-hierarchy'

extend([namesPlugin])

export function transform<T>(
  obj: Record<string, T>,
  cb: (arg0: [string, T]) => [string, T],
) {
  return Object.fromEntries(Object.entries(obj).map(cb))
}

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

export function colorContrast(
  colorScheme: Record<string, string>,
  theme: Theme,
) {
  return transform(colorScheme, ([letter, color]) => [
    letter,
    theme.palette.getContrastText(colord(color).toHex()),
  ])
}

export function skipBlanks(blanks: number[], arg: string | string[]) {
  const result = []
  let b = 0
  for (let j = 0, l = arg.length; j < l; j++) {
    if (j === blanks[b]) {
      b++
    } else {
      result.push(arg[j])
    }
  }
  return result.join('')
}

// basically same as setRadius from https://observablehq.com/@d3/tree-of-life
export function setBrLength(
  d: HierarchyNode<NodeWithIds>,
  y0: number,
  k: number,
) {
  // @ts-expect-error
  d.len = (y0 += Math.max(d.data.length || 0, 0)) * k

  if (d.children) {
    d.children.forEach(d => {
      setBrLength(d, y0, k)
    })
  }
}

// basically same as maxLength from https://observablehq.com/@d3/tree-of-life
export function maxLength(d: HierarchyNode<NodeWithIds>): number {
  return (
    (d.data.length || 0) + (d.children ? max(d.children, maxLength) || 0 : 0)
  )
}

// Collapse the node and all it's children, from
// https://bl.ocks.org/d3noob/43a860bc0024792f8803bba8ca0d5ecd
export function collapse(d: HierarchyNode<NodeWithIds>) {
  if (d.children) {
    // @ts-expect-error
    d._children = d.children
    // @ts-expect-error
    d.children = null
  }
}

export function len(a: { end: number; start: number }) {
  return a.end - a.start
}

// https://sonnhammer.sbc.su.se/Stockholm.html
// gaps can be a . or - in stockholm
export function isBlank(s?: string) {
  return s === '-' || s === '.'
}

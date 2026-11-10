import { expect, test } from 'vitest'

import r from '../../test/data/tree.asn?raw'
import { generateNodeIds } from '../util.ts'
import { parseAsn1 } from './parseAsn1.ts'
import { parseTree } from './parseTree.ts'

import type { Node } from '../types.ts'

function leaves(root: Node) {
  const out: Node[] = []
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.children?.length) {
      stack.push(...node.children.toReversed())
    } else {
      out.push(node)
    }
  }
  return out
}

test('real data file', () => {
  expect(parseAsn1(r)).toMatchSnapshot()
})

test('throws a clear error on input missing required sections', () => {
  expect(() => parseAsn1('BioTreeContainer ::= { something {} }')).toThrow(
    /missing/,
  )
})

test('the tree keeps the labels and branch lengths the file carries', () => {
  const tree = generateNodeIds(parseTree(r))
  const tips = leaves(tree)

  expect(tips.length).toBe(101)
  expect(tips[0]!.name).toBe(
    'sodium/glucose cotransporter 4 [Gouania willdenowi]',
  )
  expect(tips.some(tip => (tip.length ?? 0) > 0)).toBe(true)
  expect(tree.length).toBeUndefined()
})

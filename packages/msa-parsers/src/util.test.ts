import { expect, test } from 'vitest'

import parseNewick from './msa/parseNewick.ts'
import { generateNodeIds } from './util.ts'

import type { NodeWithIds } from './types.ts'

test('ids encode the path to each node, and name unnamed nodes', () => {
  const tree = generateNodeIds({
    children: [{ name: 'a' }, { name: 'b', children: [{ name: 'c' }] }],
  })
  expect(tree.id).toBe('node-0')
  // an unnamed node takes its id as its name
  expect(tree.name).toBe('node-0')
  expect(tree.children.map(c => [c.name, c.id])).toEqual([
    ['a', 'node-0-0-1'],
    ['b', 'node-0-1-1'],
  ])
  expect(tree.children[1]!.children.map(c => c.id)).toEqual(['node-0-1-1-0-2'])
})

test('a leaf gets an empty children array, not undefined', () => {
  expect(generateNodeIds({ name: 'solo' }).children).toEqual([])
})

// a phylogeny can be a caterpillar whose depth equals its leaf count. The
// recursive form of generateNodeIds threw "Maximum call stack size exceeded"
// somewhere past 5000 deep -- and every parsed tree goes through it, so a deep
// newick took the whole viewer down.
test('a caterpillar tree far past the recursion limit still gets ids', () => {
  const depth = 50_000
  let newick = 'leaf0:0.1'
  for (let i = 1; i <= depth; i++) {
    newick = `(${newick},leaf${i}:0.1)`
  }

  const tree = generateNodeIds(parseNewick(`${newick};`))

  let node: NodeWithIds = tree
  let seen = 0
  while (node.children.length > 1) {
    seen++
    node = node.children[0]!
  }
  expect(seen).toBe(depth)
  expect(node.name).toBe('leaf0')
})

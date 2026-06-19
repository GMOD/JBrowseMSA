import { describe, expect, test } from 'vitest'

import { flatToTree } from './flatToTree.ts'

describe('flatToTree', () => {
  test('builds a tree from a flat parent list', () => {
    const root = flatToTree([
      { id: 0 },
      { id: 1, parent: 0 },
      { id: 2, parent: 0 },
      { id: 3, parent: 1 },
    ])
    expect(root.id).toBe('0')
    expect(root.children.map(c => c.id)).toEqual(['1', '2'])
    expect(root.children[0]!.children.map(c => c.id)).toEqual(['3'])
  })

  test('throws on empty input rather than returning undefined', () => {
    expect(() => flatToTree([])).toThrow(/no root/)
  })

  test('throws when every node has a parent (cycle) rather than returning undefined', () => {
    expect(() =>
      flatToTree([
        { id: 0, parent: 1 },
        { id: 1, parent: 0 },
      ]),
    ).toThrow(/no root/)
  })
})

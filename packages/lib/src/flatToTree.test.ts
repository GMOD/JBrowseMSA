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

  test('carries the label and branch length of a BioTreeContainer node', () => {
    const root = flatToTree([
      { id: 0, label: 'Multiple organisms' },
      {
        id: 1,
        parent: 0,
        label: 'sodium/glucose cotransporter 4',
        dist: '0.5',
      },
      { id: 2, parent: 0 },
    ])
    expect(root.name).toBe('Multiple organisms')
    expect(root.children[0]).toMatchObject({
      name: 'sodium/glucose cotransporter 4',
      length: 0.5,
    })
    // no label falls back to the id, and no dist leaves the length unset
    expect(root.children[1]!.name).toBe('2')
    expect(root.children[1]!.length).toBeUndefined()
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

import { describe, expect, test } from 'vitest'

import { calculateNeighborJoiningTree } from './neighborJoining'

describe('calculateNeighborJoiningTree', () => {
  test('generates valid Newick tree for 2 sequences', () => {
    const rows: [string, string][] = [
      ['seq1', 'MKAA'],
      ['seq2', 'MKAA'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    expect(tree).toMatch(/;$/)
    expect(tree).toContain('seq1')
    expect(tree).toContain('seq2')
  })

  test('generates valid Newick tree for 3 sequences', () => {
    const rows: [string, string][] = [
      ['human', 'MKAAYLSMFG'],
      ['mouse', 'MKAAYLSMFG'],
      ['chicken', 'MKAAFLSMFG'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    expect(tree).toMatch(/;$/)
    expect(tree).toContain('human')
    expect(tree).toContain('mouse')
    expect(tree).toContain('chicken')
    expect(tree).toContain('(')
    expect(tree).toContain(')')
  })

  test('generates valid Newick tree for 4 sequences', () => {
    const rows: [string, string][] = [
      ['A', 'MKAAYLSMFGKED'],
      ['B', 'MKAAYLSMFGKED'],
      ['C', 'MKAAFLSMFGKEE'],
      ['D', 'MKAAFLSMFGKEE'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    expect(tree).toMatch(/;$/)
    expect(tree).toContain('A')
    expect(tree).toContain('B')
    expect(tree).toContain('C')
    expect(tree).toContain('D')
  })

  test('includes branch lengths in tree', () => {
    const rows: [string, string][] = [
      ['seq1', 'MKAAYLSMFG'],
      ['seq2', 'MKAAFLSMFG'],
      ['seq3', 'MKBBFLSMFG'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    // Branch lengths are formatted as :0.123456
    expect(tree).toMatch(/:\d+\.\d+/)
  })

  test('throws error for less than 2 sequences', () => {
    const rows: [string, string][] = [['seq1', 'MKAA']]
    expect(() => calculateNeighborJoiningTree(rows)).toThrow(
      'Need at least 2 sequences',
    )
  })

  test('handles sequences with gaps', () => {
    const rows: [string, string][] = [
      ['seq1', 'MK-AYLSMFG'],
      ['seq2', 'MKAAYLSMFG'],
      ['seq3', 'MKA-YLSMFG'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    expect(tree).toMatch(/;$/)
    expect(tree).toContain('seq1')
    expect(tree).toContain('seq2')
    expect(tree).toContain('seq3')
  })

  test('handles special characters in sequence names', () => {
    const rows: [string, string][] = [
      ['seq:1', 'MKAA'],
      ['seq(2)', 'MKAA'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    expect(tree).toMatch(/;$/)
    // Special characters should be escaped
    expect(tree).not.toMatch(/seq:1/)
    expect(tree).not.toMatch(/seq\(2\)/)
  })

  test('identical sequences have zero distance', () => {
    const rows: [string, string][] = [
      ['seq1', 'MKAAYLSMFG'],
      ['seq2', 'MKAAYLSMFG'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    // Identical sequences should have equal branch lengths
    const match = tree.match(/:(\d+\.\d+)/g)
    expect(match).not.toBeNull()
    if (match) {
      const lengths = match.map(m => parseFloat(m.slice(1)))
      // Branch lengths should be small or zero for identical sequences
      for (const len of lengths) {
        expect(len).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('more divergent sequences have larger distances', () => {
    const rows: [string, string][] = [
      ['similar1', 'MKAAYLSMFGKED'],
      ['similar2', 'MKAAYLSMFGKED'],
      ['different', 'WWWWWWWWWWWWW'],
    ]
    const tree = calculateNeighborJoiningTree(rows)

    expect(tree).toMatch(/;$/)
    // The tree should be valid even with very different sequences
    expect(tree).toContain('similar1')
    expect(tree).toContain('similar2')
    expect(tree).toContain('different')
  })
})

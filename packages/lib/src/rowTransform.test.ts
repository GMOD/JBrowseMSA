// @vitest-environment jsdom
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { bandOrder, passesFilters, pruneTree } from './rowTransform.ts'
import { viewerSnapshot } from './viewerSnapshot.ts'

import type { NodeWithIds, RowTransform } from './types.ts'

const msa = `>A
MKAA
>B
MKAA
>C
MRAA
>D
MRAA
>E
MRAA`

const rowData = {
  A: { host: 'duck', year: 2015, clade: '2.3.4.4b' },
  B: { host: 'chicken', year: 2009, clade: '2.3.2.1c' },
  C: { host: 'duck', year: 2021, clade: '2.3.4.4b' },
  D: { host: 'goose', year: 2012, clade: '2.3.2.1c' },
  E: { host: 'chicken' },
}

function makeModel(rowTransform?: RowTransform, tree?: string) {
  const model = MSAModelF().create({
    id: 'row-transform-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: {
      msa,
      tree,
      treeMetadata: JSON.stringify(rowData),
    },
    rowTransform,
  })
  model.setWidth(800)
  return model
}

function leaf(name: string): NodeWithIds {
  return { id: name, name, children: [] }
}

test('a filter keeps the rows passing every test, a row with no value failing', () => {
  expect(
    passesFilters({ host: 'duck' }, [{ field: 'host', oneOf: ['duck'] }]),
  ).toBe(true)
  expect(
    passesFilters({ year: '2015' }, [{ field: 'year', oneOf: [2015] }]),
  ).toBe(true)
  expect(
    passesFilters({ year: '2015' }, [{ field: 'year', range: [2010, null] }]),
  ).toBe(true)
  expect(
    passesFilters({ year: '2009' }, [{ field: 'year', range: [2010, null] }]),
  ).toBe(false)
  expect(passesFilters({}, [{ field: 'year', range: [null, null] }])).toBe(
    false,
  )
  expect(
    passesFilters({ host: 'duck', year: '2009' }, [
      { field: 'host', oneOf: ['duck'] },
      { field: 'year', range: [2010, 2020] },
    ]),
  ).toBe(false)
})

test('pruning drops the refused tips and the nodes left empty, and keeps ids', () => {
  const ab: NodeWithIds = {
    id: 'ab',
    name: 'ab',
    children: [leaf('A'), leaf('B')],
  }
  const cd: NodeWithIds = {
    id: 'cd',
    name: 'cd',
    children: [leaf('C'), leaf('D')],
  }
  const tree: NodeWithIds = { id: 'root', name: 'root', children: [ab, cd] }
  const pruned = pruneTree(tree, name => name !== 'C' && name !== 'D')!
  expect(pruned.children).toEqual([ab])
  expect(pruned.id).toBe('root')
  expect(pruneTree(tree, () => true)).toBe(tree)
  expect(pruneTree(tree, () => false)).toBeUndefined()
  const unary = pruneTree(tree, name => name !== 'D')!
  expect(unary.children[0]).toBe(ab)
  expect(unary.children[1]!.id).toBe('cd')
  expect(unary.children[1]!.children.map(n => n.name)).toEqual(['C'])
})

test('bands stack in the listed order, then in natural order', () => {
  expect(bandOrder(['10', '2', 'b', 'a'])).toEqual(['2', '10', 'a', 'b'])
  expect(bandOrder(['10', '2', 'b', 'a'], ['b', 'z'])).toEqual([
    'b',
    '2',
    '10',
    'a',
  ])
})

test('without a tree, a sort orders the rows, with no-value rows last either way', () => {
  expect(makeModel({ sort: [{ field: 'year' }] }).rowNames).toEqual([
    'B',
    'D',
    'A',
    'C',
    'E',
  ])
  expect(
    makeModel({ sort: [{ field: 'year', order: 'descending' }] }).rowNames,
  ).toEqual(['C', 'A', 'D', 'B', 'E'])
})

test('a second sort key breaks the ties of the first', () => {
  expect(
    makeModel({
      sort: [{ field: 'host' }, { field: 'year', order: 'descending' }],
    }).rowNames,
  ).toEqual(['B', 'E', 'C', 'A', 'D'])
})

test('without a tree, a filter drops rows and a facet stacks the rest in labelled bands', () => {
  const model = makeModel({
    filter: [{ field: 'host', oneOf: ['duck', 'chicken'] }],
    sort: [{ field: 'year' }],
    facet: { field: 'host', sort: ['duck'] },
  })
  expect(model.rowNames).toEqual(['A', 'C', 'B', 'E'])
  expect(
    model.resolvedClades.map(({ rows, mark, label }) => ({
      rows,
      mark,
      label,
    })),
  ).toEqual([
    { rows: [0, 1], mark: 'bracket', label: 'duck' },
    { rows: [2, 3], mark: 'bracket', label: 'chicken' },
  ])
  expect(model.cladeGutterWidth).toBeGreaterThan(0)
  expect(model.dataWarnings).toEqual([])
})

test('the rows with no value for the facet field sit last with no label', () => {
  const model = makeModel({ facet: { field: 'clade' } })
  expect(model.rowNames).toEqual(['B', 'D', 'A', 'C', 'E'])
  expect(model.resolvedClades.map(c => c.label)).toEqual([
    '2.3.2.1c',
    '2.3.4.4b',
  ])
})

test('a filter keeping no row is left unapplied and warned about', () => {
  const model = makeModel({ filter: [{ field: 'host', oneOf: ['swan'] }] })
  expect(model.rowNames).toEqual(['A', 'B', 'C', 'D', 'E'])
  expect(model.dataWarnings).toEqual([
    'rowTransform.filter keeps none of the 5 rows, so every row is shown',
  ])
})

const tree = '(((A,C),(B,D)),E);'

test('under a tree, a filter prunes the tree to the kept tips', () => {
  const model = makeModel(
    { filter: [{ field: 'host', oneOf: ['duck', 'goose'] }] },
    tree,
  )
  expect(model.rowNames).toEqual(['A', 'C', 'D'])
  expect(model.treeTips.names).toHaveLength(5)
})

test('under a tree, a sort is not applied and a warning says why', () => {
  const model = makeModel({ sort: [{ field: 'year' }] }, tree)
  expect(model.rowNames).toEqual(['A', 'C', 'B', 'D', 'E'])
  expect(model.dataWarnings).toEqual([
    'The tree sets the row order, so rowTransform.sort is not applied',
  ])
})

test('under a tree, a facet labels each band that is a clade and keeps the order', () => {
  const model = makeModel({ facet: { field: 'clade' } }, tree)
  const order = model.rowNames
  expect(order).toEqual(['A', 'C', 'B', 'D', 'E'])
  expect(
    model.resolvedClades.map(({ rows, label }) => ({
      label,
      names: order.slice(rows[0], rows[1] + 1),
    })),
  ).toEqual([
    { label: '2.3.2.1c', names: ['B', 'D'] },
    { label: '2.3.4.4b', names: ['A', 'C'] },
  ])
  expect(model.dataWarnings).toEqual([])
})

const splitTree = '((A,(B,C)),(D,E));'

test('under a tree, a band that is not a clade draws nothing and is counted', () => {
  const model = makeModel({ facet: { field: 'host' } }, splitTree)
  expect(model.resolvedClades.map(c => c.label)).toEqual(['goose'])
  expect(model.dataWarnings).toEqual([
    '2 of 3 facet bands are not clades of the tree and draw no label: chicken, duck',
  ])
})

test('a band that is a clade once the filter prunes the tree draws', () => {
  const model = makeModel(
    {
      filter: [{ field: 'host', oneOf: ['duck', 'goose'] }],
      facet: { field: 'host' },
    },
    splitTree,
  )
  expect(model.rowNames).toEqual(['A', 'C', 'D'])
  expect(model.resolvedClades.map(c => c.label)).toEqual(['duck', 'goose'])
  expect(model.dataWarnings).toEqual([])
})

test('the snapshot carries rowTransform as written, and a reroot keeps it', () => {
  const transform: RowTransform = { facet: { field: 'clade' } }
  const model = makeModel(transform, tree)
  model.setTreeRoot('midpoint')
  expect(getSnapshot(model).rowTransform).toEqual(transform)
  expect(model.resolvedClades.map(c => c.label)).toEqual([
    '2.3.2.1c',
    '2.3.4.4b',
  ])
  expect(JSON.stringify(getSnapshot(makeModel()))).not.toContain('rowTransform')
})

test('the MSAViewer prop reaches the snapshot the viewer creates', () => {
  const rowTransform: RowTransform = { sort: [{ field: 'year' }] }
  const model = MSAModelF().create({
    ...viewerSnapshot({ msa, rowData, rowTransform }),
    msaFormat: 'fasta',
  })
  expect(model.rowNames).toEqual(['B', 'D', 'A', 'C', 'E'])
})

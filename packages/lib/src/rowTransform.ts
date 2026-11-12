import { preorder } from '@gmod/newick'

import { compareGroupKeys } from './groupKeys.ts'
import { leafIndex, leaves, mrca } from './hierarchy.ts'

import type { HierarchyNode } from './hierarchy.ts'
import type {
  Clade,
  NodeWithIds,
  RowFacet,
  RowFilter,
  RowSort,
  RowTransform,
} from './types.ts'

type RowFields = (name: string) => Record<string, string> | undefined

function fieldValue(fields: RowFields, name: string, field: string) {
  return fields(name)?.[field] ?? ''
}

function inRange(value: number, [min, max]: [number | null, number | null]) {
  return (
    Number.isFinite(value) &&
    (min === null || value >= min) &&
    (max === null || value <= max)
  )
}

/** whether a row passes every test, a row with no value failing each */
export function passesFilters(
  fields: Record<string, string> | undefined,
  filters: RowFilter[],
) {
  return filters.every(filter => {
    const value = fields?.[filter.field] ?? ''
    return (
      value !== '' &&
      ('oneOf' in filter
        ? filter.oneOf.some(kept => String(kept) === value)
        : inRange(Number(value), filter.range))
    )
  })
}

/**
 * The tree with every tip `keep` refuses removed, and every internal node left
 * with no children removed with it. A node keeps its id, and a subtree losing
 * nothing is the same object, so `collapsed`, `rotated` and `showOnly` still
 * name their nodes. Undefined where no tip is kept.
 */
export function pruneTree(tree: NodeWithIds, keep: (name: string) => boolean) {
  const kept = new Map<NodeWithIds, NodeWithIds | undefined>()
  for (const node of preorder(tree).toReversed()) {
    if (node.children.length === 0) {
      kept.set(node, keep(node.name) ? node : undefined)
    } else {
      const children = node.children.flatMap(child => {
        const k = kept.get(child)
        return k ? [k] : []
      })
      kept.set(
        node,
        children.length === 0
          ? undefined
          : children.length === node.children.length &&
              children.every((child, i) => child === node.children[i])
            ? node
            : { ...node, children },
      )
    }
  }
  return kept.get(tree)
}

function compareBySort(sort: RowSort[], fields: RowFields) {
  return (a: string, b: string) => {
    for (const { field, order } of sort) {
      const x = fieldValue(fields, a, field)
      const y = fieldValue(fields, b, field)
      if (x !== y) {
        const byValue = compareGroupKeys(x, y)
        return x === '' || y === '' || order !== 'descending'
          ? byValue
          : -byValue
      }
    }
    return 0
  }
}

/**
 * The band values in the order the bands stack: the values `listed` names,
 * then the rest in natural order, with the no-value band last
 */
export function bandOrder(values: Iterable<string>, listed: string[] = []) {
  const present = new Set(values)
  return [
    ...listed.filter(value => present.has(value)),
    ...[...present]
      .filter(value => !listed.includes(value))
      .toSorted(compareGroupKeys),
  ]
}

/**
 * A tree with no branches, the rows as the root's children, put in the order
 * `sort` gives and then stacked into the facet's bands. Each band keeps the
 * sorted order, and a sort is stable, so rows that tie keep the file's order.
 */
export function arrangeRows(
  tree: NodeWithIds,
  fields: RowFields,
  transform: RowTransform | undefined,
) {
  const sort = transform?.sort ?? []
  const facet = transform?.facet
  const compare = compareBySort(sort, fields)
  const sorted =
    sort.length > 0
      ? tree.children.toSorted((a, b) => compare(a.name, b.name))
      : tree.children
  const children = facet
    ? bandRows(
        sorted,
        node => fieldValue(fields, node.name, facet.field),
        facet,
      )
    : sorted
  return children === tree.children ? tree : { ...tree, children }
}

function bandRows<T>(rows: T[], valueOf: (row: T) => string, facet: RowFacet) {
  const values = rows.map(valueOf)
  const band = new Map(bandOrder(values, facet.sort).map((v, i) => [v, i]))
  return rows
    .map((row, i) => ({ row, band: band.get(values[i]!)! }))
    .toSorted((a, b) => a.band - b.band)
    .map(({ row }) => row)
}

/**
 * One `bracket` clade per band, labelled with its value, over the rows in
 * `names`. Under a tree a band names its tips as an `mrca`, so it resolves
 * only where they are a clade; without one the rows are stacked by band, and a
 * band names its first and last row as a `range`. The no-value rows draw none.
 */
export function facetClades(
  names: string[],
  fields: RowFields,
  facet: RowFacet,
  underTree: boolean,
): Clade[] {
  const bands = new Map<string, string[]>()
  for (const name of names) {
    const value = fieldValue(fields, name, facet.field)
    if (value !== '') {
      const band = bands.get(value)
      if (band) {
        band.push(name)
      } else {
        bands.set(value, [name])
      }
    }
  }
  return bandOrder(bands.keys(), facet.sort).map(value => {
    const tips = bands.get(value)!
    return {
      ...(underTree
        ? { mrca: tips }
        : { range: [tips[0]!, tips.at(-1)!] as [string, string] }),
      tips: tips.length,
      mark: 'bracket' as const,
      label: value,
    }
  })
}

/** the names of a tree's tips, in the order the file gives them */
export function tipNames(tree: NodeWithIds) {
  return preorder(tree)
    .filter(node => node.children.length === 0)
    .map(node => node.name)
}

/** the labels of the `mrca` bands whose tips are not one clade of `root` */
export function bandsNotClades(clades: Clade[], root: HierarchyNode) {
  const index = leafIndex(root)
  return clades.flatMap(clade => {
    const node = clade.mrca ? mrca(root, clade.mrca, index) : undefined
    return node && leaves(node).length === clade.tips ? [] : [clade.label ?? '']
  })
}

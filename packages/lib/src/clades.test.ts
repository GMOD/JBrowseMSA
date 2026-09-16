// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'

import {
  bracketBarWidth,
  bracketGap,
  maxCladeGutterWidth,
} from './components/tree/cladeBrackets.ts'
import MSAModelF from './model.ts'

import type * as FetchUtils from './fetchUtils.ts'
import type { Clade } from './types.ts'

// uri -> resolver of the fetch a filehandle autorun kicked off
const inFlight = new Map<string, (text: string) => void>()

vi.mock('@jbrowse/core/util/io', () => ({
  openLocation: (loc: { uri: string }) => loc,
}))

vi.mock('./fetchUtils.ts', async importOriginal => ({
  ...(await importOriginal<typeof FetchUtils>()),
  fetchTextWithProgress: (loc: { uri: string }) =>
    new Promise<string>(resolve => {
      inFlight.set(loc.uri, resolve)
    }),
}))

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

const msa = `>A
MKAA
>B
MKAA
>C
MRAA
>D
MRAA`

const tree = '((A,B),(C,D));'

const defaultFill = 'rgba(255, 243, 196, 0.6)'

function makeModel(clades: Clade[], treeText = tree) {
  const model = MSAModelF().create({
    id: 'clades-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree: treeText },
    clades,
  })
  model.setWidth(800)
  return model
}

test('an MRCA and its tip count resolve to the rows the clade covers', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'highlight' }])
  expect(model.rowNames).toEqual(['A', 'B', 'C', 'D'])
  expect(model.resolvedClades).toMatchObject([
    { rows: [0, 1], mark: 'highlight', color: defaultFill },
  ])
})

test('two tips address a clade of any size', () => {
  const model = makeModel([{ mrca: ['A', 'D'], tips: 4, mark: 'highlight' }])
  expect(model.resolvedClades[0]!.rows).toEqual([0, 3])
})

test('a tip count the tree disagrees with drops the clade', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 3, mark: 'highlight' }])
  expect(model.resolvedClades).toEqual([])
})

test('an unknown tip name drops the clade', () => {
  const model = makeModel([{ mrca: ['A', 'nope'], tips: 2, mark: 'highlight' }])
  expect(model.resolvedClades).toEqual([])
})

test('a tip name two rows share drops the clade', () => {
  const model = makeModel(
    [{ mrca: ['A', 'C'], tips: 2, mark: 'highlight' }],
    '((A,B),(A,D));',
  )
  expect(model.resolvedClades).toEqual([])
})

test('a range covers the run between its ends, given in either order', () => {
  const forward = makeModel([{ range: ['B', 'D'], tips: 3, mark: 'highlight' }])
  const backward = makeModel([
    { range: ['D', 'B'], tips: 3, mark: 'highlight' },
  ])
  expect(forward.resolvedClades[0]!.rows).toEqual([1, 3])
  expect(backward.resolvedClades[0]!.rows).toEqual([1, 3])
})

test("a range's tip count is checked against the length of the run", () => {
  const model = makeModel([{ range: ['B', 'D'], tips: 2, mark: 'highlight' }])
  expect(model.resolvedClades).toEqual([])
})

test('a color with no alpha of its own draws translucent', () => {
  const model = makeModel([
    { mrca: ['A', 'B'], tips: 2, mark: 'highlight', color: '#e41a1c' },
    { mrca: ['C', 'D'], tips: 2, mark: 'highlight', color: 'rgba(0,0,0,0.9)' },
  ])
  expect(model.resolvedClades.map(c => c.color)).toEqual([
    'rgba(228, 26, 28, 0.6)',
    'rgba(0,0,0,0.9)',
  ])
})

test('a collapsed neighbour moves the rows and keeps the clade', () => {
  const model = makeModel([{ mrca: ['C', 'D'], tips: 2, mark: 'highlight' }])
  model.toggleCollapsed(model.root.children![0]!.data.id)
  expect(model.rowNames.slice(1)).toEqual(['C', 'D'])
  expect(model.resolvedClades[0]!.rows).toEqual([1, 2])
})

test('setClades replaces the layer', () => {
  const model = makeModel([])
  expect(model.resolvedClades).toEqual([])
  model.setClades([{ mrca: ['C', 'D'], tips: 2, mark: 'highlight' }])
  expect(model.resolvedClades[0]!.rows).toEqual([2, 3])
})

test('no bracket mark leaves no gutter', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'highlight' }])
  expect(model.cladeGutterWidth).toBe(0)
  expect(model.treeAreaWidthMinusMargin).toBe(
    model.treeAreaWidth - model.marginLeft,
  )
})

test('a bracket reserves a gutter the tip labels stay clear of', () => {
  const bar = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'bracket' }])
  const labelled = makeModel([
    { mrca: ['A', 'B'], tips: 2, mark: 'bracket', label: 'clade I' },
  ])
  expect(bar.cladeGutterWidth).toBeGreaterThan(0)
  expect(labelled.cladeGutterWidth).toBeGreaterThan(bar.cladeGutterWidth)
  expect(labelled.treeAreaWidthMinusMargin).toBe(
    labelled.treeAreaWidth - labelled.marginLeft - labelled.cladeGutterWidth,
  )
})

test('a highlight carrying a label takes the gutter for the label alone', () => {
  const highlight = makeModel([
    { mrca: ['A', 'B'], tips: 2, mark: 'highlight', label: 'clade I' },
  ])
  const bracket = makeModel([
    { mrca: ['A', 'B'], tips: 2, mark: 'bracket', label: 'clade I' },
  ])
  expect(highlight.cladeGutterWidth).toBeCloseTo(
    bracket.cladeGutterWidth - bracketBarWidth - bracketGap,
  )
})

test('a label too long for the gutter is capped', () => {
  const model = makeModel([
    {
      mrca: ['A', 'B'],
      tips: 2,
      mark: 'bracket',
      label: 'a clade name nobody would fit beside a tree',
    },
  ])
  expect(model.cladeGutterWidth).toBe(maxCladeGutterWidth)
})

test('a collapse mark collapses the clade at load', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'collapse' }])
  expect(model.collapsed).toEqual(['node-0-0-1'])
  expect(model.rowNames).toEqual(['node-0-0-1', 'C', 'D'])
})

test('a collapse mark waits for a tree filehandle that lands after the MSA', async () => {
  const model = MSAModelF().create({
    id: 'clades-filehandle-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    msaFilehandle: { locationType: 'UriLocation', uri: 'aln.fa' },
    treeFilehandle: { locationType: 'UriLocation', uri: 'tree.nh' },
    clades: [{ mrca: ['A', 'B'], tips: 2, mark: 'collapse' }],
  })
  model.setWidth(800)
  inFlight.get('aln.fa')!(msa)
  await flush()
  expect(model.dataInitialized).toBe(true)
  expect(model.collapsed).toEqual([])

  inFlight.get('tree.nh')!(tree)
  await flush()
  expect(model.collapsed).toEqual(['node-0-0-1'])
  expect(model.rowNames).toEqual(['node-0-0-1', 'C', 'D'])
})

test('a collapse seeded at load rebuilds the raster tile cache', () => {
  // `leaves` is one of the rasterKeys (msaRaster.ts), so the tiles built for
  // four rows are dropped for the three the collapse leaves
  const plain = makeModel([])
  const collapsed = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'collapse' }])
  expect(plain.leaves).toHaveLength(4)
  expect(collapsed.leaves).toHaveLength(3)
})

test('expanding a seeded clade sticks until the next load', () => {
  const model = makeModel([{ mrca: ['A', 'B'], tips: 2, mark: 'collapse' }])
  model.toggleCollapsed('node-0-0-1')
  expect(model.collapsed).toEqual([])
  expect(model.rowNames).toEqual(['A', 'B', 'C', 'D'])
})

test('a focus mark opens on the clade', () => {
  const model = makeModel([{ mrca: ['C', 'D'], tips: 2, mark: 'focus' }])
  expect(model.showOnly).toBe('node-0-1-1')
  expect(model.rowNames).toEqual(['C', 'D'])
})

test('a range record cannot collapse or focus, so it is dropped', () => {
  const model = makeModel([
    { range: ['A', 'B'], tips: 2, mark: 'collapse' },
    { range: ['C', 'D'], tips: 2, mark: 'focus' },
  ])
  expect(model.resolvedClades).toEqual([])
  expect(model.collapsed).toEqual([])
  expect(model.showOnly).toBeUndefined()
})

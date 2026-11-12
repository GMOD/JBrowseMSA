import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { describe, expect, test } from 'vitest'

import colorSchemes from './colorSchemes.ts'
import {
  catalogedSchemeNames,
  colorSchemeMenuItems,
} from './components/header/colorSchemeMenuItems.ts'
import { tileColorFn } from './components/msa/tileColor.ts'
import MSAModelF from './model.ts'

import type { MsaViewModel } from './model.ts'
import type { MenuItem } from '@jbrowse/core/ui/Menu'

const msa = '>a\nMKAK\n>b\nMRAK\n'
const protein = { data: { msa: '>a\nMWLE\n>b\nMWLD\n' } }
const gff = `##gff-version 3
a\tsrc\tDomain\t1\t3\t.\t.\t.\tID=d1;Name=Kinase;Ontology_term=IPR000001`

function makeModel(snapshot: Record<string, unknown> = {}) {
  return MSAModelF().create({ type: 'MsaView', data: { msa }, ...snapshot })
}

test('a view at the defaults writes no residueColor into its snapshot', () => {
  const model = makeModel()
  expect(model.resolvedResidueColor).toMatchObject({
    channel: 'fill',
    field: 'feature',
    scheme: 'maeditor',
    letters: undefined,
  })
  expect(JSON.stringify(getSnapshot(model))).not.toContain('residueColor')
  model.setResidueColor({ channel: 'fill', scale: { scheme: 'maeditor' } })
  expect(JSON.stringify(getSnapshot(model))).not.toContain('residueColor')
})

test('a letter map travels in the snapshot and colors the letters it lists', () => {
  const model = makeModel()
  model.setResidueColor({
    scale: { domain: ['K', 'R'], range: ['#1f77b4', '#1f77b4'] },
  })
  const snap = getSnapshot(model)
  expect(snap.residueColor).toEqual({
    scale: { domain: ['K', 'R'], range: ['#1f77b4', '#1f77b4'] },
  })

  const reopened = makeModel(snap)
  const color = tileColorFn(reopened)
  expect(color(1, 'K')).toBe('#1f77b4')
  expect(color(1, 'R')).toBe('#1f77b4')
  expect(color(0, 'M')).toBeUndefined()
  expect(color(2, '-')).toBeUndefined()
})

test('a letter map keys its letters in either case, as the rows are drawn upper case', () => {
  const model = makeModel({
    residueColor: { scale: { domain: ['k'], range: ['#1f77b4'] } },
  })
  expect(model.columns.get('a')).toBe('MKAK')
  expect(tileColorFn(model)(1, 'K')).toBe('#1f77b4')
})

test('a letter map over a dynamic scheme name colors from the map', () => {
  const model = makeModel({
    residueColor: {
      scale: {
        scheme: 'clustalx_protein_dynamic',
        domain: ['A'],
        range: ['#d62728'],
      },
    },
  })
  expect(model.dynamicColorSchemeName).toBeUndefined()
  const color = tileColorFn(model)
  expect(color(2, 'A')).toBe('#d62728')
  expect(color(1, 'K')).toBeUndefined()

  model.setResidueColor({ scale: { scheme: 'clustalx_protein_dynamic' } })
  expect(model.dynamicColorSchemeName).toBe('clustalx_protein_dynamic')
})

function checkedLabels(items: MenuItem[]) {
  return items
    .filter(item => 'checked' in item && item.checked)
    .map(item => 'label' in item && item.label)
}

test('the menu checks Custom while a letter map is set, and a named scheme clears it', () => {
  const model = makeModel({
    ...protein,
    residueColor: { scale: { domain: ['K'], range: ['#1f77b4'] } },
  })
  expect(checkedLabels(colorSchemeMenuItems(model))).toEqual(['Custom'])

  const clustal = colorSchemeMenuItems(model).find(
    item => 'label' in item && item.label === 'Clustal X',
  )
  if (clustal && 'onClick' in clustal) {
    clustal.onClick()
  }
  expect(model.resolvedResidueColor.letters).toBeUndefined()
  expect(getSnapshot(model).residueColor).toEqual({
    scale: { scheme: 'clustalx_protein' },
  })

  const after = colorSchemeMenuItems(model)
  expect(after.some(item => 'label' in item && item.label === 'Custom')).toBe(
    false,
  )
  expect(checkedLabels(after)).toEqual(['Clustal X'])
})

test('the menu names every scheme', () => {
  expect(catalogedSchemeNames.toSorted()).toEqual(
    Object.keys(colorSchemes).toSorted(),
  )
})

test('a protein alignment lists protein schemes, the rest under More schemes', () => {
  const items = colorSchemeMenuItems(makeModel(protein))
  const labels = items.map(item => 'label' in item && item.label)
  expect(labels).toContain('Clustal X')
  expect(labels).not.toContain('Rainbow')
  const more = items.find(
    item => 'label' in item && item.label === 'More schemes',
  )
  expect(
    more && 'subMenu' in more && Array.isArray(more.subMenu)
      ? more.subMenu.map(item => 'label' in item && item.label)
      : [],
  ).toContain('Rainbow')
})

// what a cell shows: who fills it, whether the domains draw as a bar, and the
// color the residue scale gives every cell
function resolvedFill(model: MsaViewModel) {
  const color = tileColorFn(model)
  return {
    cellFill: model.cellFill,
    domainUnderline: model.domainUnderline,
    dynamic: model.dynamicColorSchemeName,
    cells: [...model.columns.values()].map(row =>
      row.split('').map((letter, col) => color(col, letter)),
    ),
  }
}

// each pair is a snapshot as a link written before `residueColor` carries it,
// and the same view spelled with `residueColor`
const legacy = [
  {
    name: 'a dynamic scheme, as the tutorials link it',
    old: { colorSchemeName: 'clustalx_protein_dynamic' },
    current: {
      residueColor: { scale: { scheme: 'clustalx_protein_dynamic' } },
    },
  },
  {
    name: 'a nucleotide scheme',
    old: {
      colorSchemeName: 'nucleotide',
      data: { msa: '>a\nACGT\n>b\nAGGT\n' },
    },
    current: {
      residueColor: { scale: { scheme: 'nucleotide' } },
      data: { msa: '>a\nACGT\n>b\nAGGT\n' },
    },
  },
  {
    name: "the letter map docs/layers.md's customColorScheme section linked",
    old: {
      customColorScheme: {
        K: '#1f77b4',
        R: '#1f77b4',
        D: '#d62728',
        E: '#d62728',
      },
    },
    current: {
      residueColor: {
        scale: {
          domain: ['K', 'R', 'D', 'E'],
          range: ['#1f77b4', '#1f77b4', '#d62728', '#d62728'],
        },
      },
    },
  },
  {
    name: 'a letter map over a scheme name',
    old: {
      colorSchemeName: 'clustalx_protein_dynamic',
      customColorScheme: { k: '#1f77b4' },
    },
    current: {
      residueColor: {
        scale: {
          scheme: 'clustalx_protein_dynamic',
          domain: ['k'],
          range: ['#1f77b4'],
        },
      },
    },
  },
  {
    name: 'letter coloring',
    old: { bgColor: false, colorSchemeName: 'clustal' },
    current: {
      residueColor: { channel: 'color', scale: { scheme: 'clustal' } },
    },
  },
  {
    name: 'domains filling the cells, the default under a GFF',
    old: { domainFill: true, bgColor: true, data: { msa, gff } },
    current: { data: { msa, gff } },
  },
  {
    name: 'the scheme keeping the cells under a GFF',
    old: { domainFill: false, data: { msa, gff } },
    current: { residueColor: { field: 'residue' }, data: { msa, gff } },
  },
  {
    name: 'letter coloring under a GFF with the domain fill off',
    old: { bgColor: false, domainFill: false, data: { msa, gff } },
    current: {
      residueColor: { channel: 'color', field: 'residue' },
      data: { msa, gff },
    },
  },
]

describe('a snapshot with the keys written before residueColor', () => {
  test.each(legacy)(
    '$name resolves the fill its residueColor does',
    ({ old, current }) => {
      const lifted = makeModel(old)
      const written = makeModel(current)
      lifted.setWidth(800)
      written.setWidth(800)
      expect(resolvedFill(lifted)).toEqual(resolvedFill(written))
      expect(getSnapshot(lifted).residueColor).toEqual(
        getSnapshot(written).residueColor,
      )
    },
  )

  test('a lifted snapshot writes only residueColor back', () => {
    const snap = JSON.stringify(
      getSnapshot(
        makeModel({
          bgColor: false,
          colorSchemeName: 'lesk',
          customColorScheme: { K: '#1f77b4' },
          domainFill: false,
        }),
      ),
    )
    expect(snap).toContain('residueColor')
    for (const key of [
      'bgColor',
      'colorSchemeName',
      'customColorScheme',
      'domainFill',
    ]) {
      expect(snap).not.toContain(key)
    }
  })

  test('the old keys draw what they drew', () => {
    expect(makeModel({ bgColor: false }).cellFill).toBe('none')
    expect(makeModel({ data: { msa, gff } }).cellFill).toBe('domain')
    expect(makeModel({ domainFill: false, data: { msa, gff } }).cellFill).toBe(
      'residue',
    )
    expect(
      makeModel({ colorSchemeName: 'percent_identity_dynamic' })
        .dynamicColorSchemeName,
    ).toBe('percent_identity_dynamic')
  })

  test('a residueColor beside the old keys wins member by member', () => {
    const model = makeModel({
      bgColor: false,
      colorSchemeName: 'lesk',
      domainFill: false,
      residueColor: { channel: 'fill', scale: { scheme: 'flower' } },
    })
    expect(getSnapshot(model).residueColor).toEqual({
      field: 'residue',
      scale: { scheme: 'flower' },
    })
  })
})

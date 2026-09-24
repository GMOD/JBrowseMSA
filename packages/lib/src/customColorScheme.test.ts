import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { colorSchemeMenuItems } from './components/header/ColorSchemeMenu.tsx'
import { tileColorFn } from './components/msa/tileColor.ts'
import MSAModelF from './model.ts'

const msa = '>a\nMKAK\n>b\nMRAK\n'

function makeModel(snapshot: Record<string, unknown> = {}) {
  return MSAModelF().create({ type: 'MsaView', data: { msa }, ...snapshot })
}

test('a view with no map writes none into its snapshot', () => {
  const model = makeModel()
  expect(model.customColorScheme).toBeUndefined()
  expect(JSON.stringify(getSnapshot(model))).not.toContain('customColorScheme')
})

test('a map travels in the snapshot and colors the letters it lists', () => {
  const model = makeModel()
  model.setCustomColorScheme({ K: '#1f77b4', R: '#1f77b4' })
  const snap = JSON.parse(JSON.stringify(getSnapshot(model)))
  expect(snap.customColorScheme).toEqual({ K: '#1f77b4', R: '#1f77b4' })

  const reopened = makeModel(snap)
  const color = tileColorFn(reopened)
  expect(color(1, 'K')).toBe('#1f77b4')
  expect(color(1, 'R')).toBe('#1f77b4')
  expect(color(0, 'M')).toBeUndefined()
  expect(color(2, '-')).toBeUndefined()
})

test('a map keys its letters in either case, as the rows are drawn upper case', () => {
  const model = makeModel({ customColorScheme: { k: '#1f77b4' } })
  expect(model.columns.get('a')).toBe('MKAK')
  expect(tileColorFn(model)(1, 'K')).toBe('#1f77b4')
})

test('a map over a dynamic scheme name colors from the map', () => {
  const model = makeModel({
    colorSchemeName: 'clustalx_protein_dynamic',
    customColorScheme: { A: '#d62728' },
  })
  expect(model.dynamicColorSchemeName).toBeUndefined()
  const color = tileColorFn(model)
  expect(color(2, 'A')).toBe('#d62728')
  expect(color(1, 'K')).toBeUndefined()

  model.setCustomColorScheme(undefined)
  expect(model.dynamicColorSchemeName).toBe('clustalx_protein_dynamic')
})

test('the menu checks Custom while a map is set, and a named scheme clears it', () => {
  const model = makeModel({ customColorScheme: { K: '#1f77b4' } })
  const items = colorSchemeMenuItems(model)
  expect(items.filter(item => item.checked).map(item => item.label)).toEqual([
    'Custom',
  ])

  items.find(item => item.label === 'clustal')!.onClick()
  expect(model.customColorScheme).toBeUndefined()
  expect(model.colorSchemeName).toBe('clustal')
  expect(JSON.stringify(getSnapshot(model))).not.toContain('customColorScheme')

  const after = colorSchemeMenuItems(model)
  expect(after.some(item => item.label === 'Custom')).toBe(false)
  expect(after.filter(item => item.checked).map(item => item.label)).toEqual([
    'clustal',
  ])
})

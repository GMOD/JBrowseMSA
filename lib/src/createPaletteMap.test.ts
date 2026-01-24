import { expect, test } from 'vitest'

import { createPaletteMap } from './createPaletteMap'
import palettes from './ggplotPalettes'

// Original implementation for comparison
function originalFillPalette(keys: string[]) {
  let i = 0
  const map = {} as Record<string, string>
  for (const key of keys) {
    const k = Math.min(keys.length - 1, palettes.length - 1)
    map[key] = palettes[k]![i]!
    i++
  }
  return map
}

test('createPaletteMap matches original implementation with 1 key', () => {
  const keys = ['IPR001234']
  expect(createPaletteMap(keys)).toEqual(originalFillPalette(keys))
})

test('createPaletteMap matches original implementation with 3 keys', () => {
  const keys = ['IPR001234', 'IPR005678', 'IPR009012']
  expect(createPaletteMap(keys)).toEqual(originalFillPalette(keys))
})

test('createPaletteMap matches original implementation with 8 keys (max palette size)', () => {
  const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  expect(createPaletteMap(keys)).toEqual(originalFillPalette(keys))
})

test('createPaletteMap matches original implementation with more keys than palette colors', () => {
  const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  expect(createPaletteMap(keys)).toEqual(originalFillPalette(keys))
})

test('createPaletteMap returns correct colors for 3 keys', () => {
  const keys = ['X', 'Y', 'Z']
  const result = createPaletteMap(keys)
  // With 3 keys, uses palette index 2 (0-indexed)
  expect(result).toEqual({
    X: '#F8766D',
    Y: '#00BA38',
    Z: '#619CFF',
  })
})

test('createPaletteMap returns empty object for empty keys', () => {
  expect(createPaletteMap([])).toEqual({})
})

test('createPaletteMap preserves key order', () => {
  const keys = ['Z', 'A', 'M']
  const result = createPaletteMap(keys)
  expect(Object.keys(result)).toEqual(['Z', 'A', 'M'])
})

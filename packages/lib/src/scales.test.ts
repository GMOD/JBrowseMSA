import { expect, test } from 'vitest'

import { createPaletteMap } from './createPaletteMap.ts'
import { namedPalettes } from './ggplotPalettes.ts'
import { resolveScale } from './scales.ts'

test('a spec with no palette takes the ggplot colors of its size', () => {
  const { colorOf, legend, kind } = resolveScale(undefined, ['a', 'b', 'a'])
  expect(kind).toBe('categorical')
  expect(colorOf('a')).toBe('#F8766D')
  expect(colorOf('b')).toBe('#00BFC4')
  expect(legend).toEqual([
    { id: 'a', label: 'a', color: '#F8766D' },
    { id: 'b', label: 'b', color: '#00BFC4' },
  ])
})

test('a named palette colors the domain in its own order', () => {
  const { colorOf } = resolveScale({ palette: 'set1' }, ['clade B', 'clade A'])
  expect(colorOf('clade A')).toBe(namedPalettes.set1![0])
  expect(colorOf('clade B')).toBe(namedPalettes.set1![1])
})

test('an unknown palette name falls back to the ggplot colors', () => {
  const { colorOf } = resolveScale({ palette: 'brewer-nine' }, ['a', 'b'])
  expect(colorOf('a')).toBe('#F8766D')
})

test('a domain past the palette gets a hue of its own per value', () => {
  const values = Array.from({ length: 12 }, (_, i) => `v${i}`)
  const { colorOf, legend } = resolveScale({ palette: 'dark2' }, values)
  const colors = values.map(colorOf)
  expect(new Set(colors).size).toBe(12)
  expect(legend).toHaveLength(12)
})

test('a map colors the values it names and no others', () => {
  const { colorOf, legend } = resolveScale(
    { map: { '19B': '#e41a1c', '20A': '#377eb8' } },
    ['19B', '21K'],
  )
  expect(colorOf('19B')).toBe('#e41a1c')
  expect(colorOf('21K')).toBeUndefined()
  // 20A is in the map and not in the data, so no legend entry stands for rows
  // that are not there
  expect(legend).toEqual([{ id: '19B', label: '19B', color: '#e41a1c' }])
})

test('the domain sorts, so row order does not move a color', () => {
  const forward = resolveScale(undefined, ['x', 'y', 'z'])
  const shuffled = resolveScale(undefined, ['z', 'x', 'y'])
  expect(shuffled.colorOf('z')).toBe(forward.colorOf('z'))
})

test('an empty field gives an empty legend and no colors', () => {
  const { colorOf, legend } = resolveScale({ palette: 'set1' }, [])
  expect(legend).toEqual([])
  expect(colorOf('anything')).toBeUndefined()
})

test('createPaletteMap without a palette keeps the ggplot ramp', () => {
  expect(createPaletteMap(['a', 'b', 'c'])).toEqual({
    a: '#F8766D',
    b: '#00BA38',
    c: '#619CFF',
  })
})

import palettes from './ggplotPalettes.ts'

/**
 * Creates a map from keys to colors using ggplot-style palettes.
 * The palette is selected based on the number of keys.
 */
export function createPaletteMap(keys: string[]) {
  const k = Math.min(keys.length - 1, palettes.length - 1)
  const palette = palettes[k]!
  return Object.fromEntries(keys.map((key, i) => [key, palette[i]!]))
}

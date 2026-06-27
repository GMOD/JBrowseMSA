import { colord } from 'colord'

import palettes from './ggplotPalettes.ts'

/**
 * Creates a map from keys to colors. Up to the largest ggplot palette (8 keys)
 * we use the hand-picked ggplot colors; beyond that — e.g. a gene-structure
 * overlay with one feature per exon — we generate evenly spaced HSL hues so
 * every key still gets a distinct, stable color instead of running off the end
 * of the palette.
 */
export function createPaletteMap(keys: string[]) {
  const n = keys.length
  if (n <= palettes.length) {
    const palette = palettes[n - 1]!
    return Object.fromEntries(keys.map((key, i) => [key, palette[i]!]))
  }
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      colord({ h: (i * 360) / n, s: 60, l: 60 }).toHex(),
    ]),
  )
}

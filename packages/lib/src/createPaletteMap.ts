import { colord } from 'colord'

import palettes from './ggplotPalettes.ts'

/**
 * Creates a map from keys to colors. `palette` names the colors to take in
 * order, such as the list a scale asked for by name; without it the keys take
 * the ggplot palette of their own size. Beyond the colors available — a
 * gene-structure overlay with one feature per exon, or nine keys on an
 * eight-color palette — every key gets an evenly spaced HSL hue instead, so no
 * two keys share a color.
 */
export function createPaletteMap(
  keys: string[],
  palette?: readonly string[] | undefined,
) {
  const n = keys.length
  const colors = palette ?? palettes[n - 1]
  if (colors && n <= colors.length) {
    return Object.fromEntries(keys.map((key, i) => [key, colors[i]!]))
  }
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      colord({ h: (i * 360) / n, s: 60, l: 60 }).toHex(),
    ]),
  )
}

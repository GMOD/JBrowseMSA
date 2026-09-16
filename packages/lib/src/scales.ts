import { createPaletteMap } from './createPaletteMap.ts'
import { paletteNamed } from './ggplotPalettes.ts'

import type { LegendEntry } from './types.ts'

/** how a channel reads a field: a palette by name, or a color per value */
export interface ScaleSpec {
  palette?: string
  map?: Record<string, string>
}

export interface ResolvedScale {
  kind: 'categorical'
  colorOf: (value: string) => string | undefined
  legend: LegendEntry[]
}

/**
 * The scale a channel reads its field through. `values` are the field's values,
 * in any order and with repeats; the domain is their distinct values sorted, so
 * a value keeps its color when rows are re-ordered, collapsed or filtered.
 *
 * `{map}` colors the values the producer named and leaves the rest uncolored.
 * `{palette}` takes the colors of a named palette, and a spec with neither
 * takes the ggplot palette of the domain's size. Every scale is categorical
 * today; a continuous one waits for a caller.
 */
export function resolveScale(
  spec: ScaleSpec | undefined,
  values: Iterable<string>,
): ResolvedScale {
  const domain = [...new Set(values)].sort((a, b) => a.localeCompare(b))
  const { map, palette } = spec ?? {}
  const colors = map ?? createPaletteMap(domain, paletteNamed(palette))
  const present = new Set(domain)
  const labels = map ? Object.keys(map).filter(v => present.has(v)) : domain
  return {
    kind: 'categorical',
    colorOf: (value: string) => colors[value],
    // a categorical value is its own label, and the id a legend keys on
    legend: labels.map(value => ({
      id: value,
      label: value,
      color: colors[value]!,
    })),
  }
}

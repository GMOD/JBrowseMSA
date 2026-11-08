import { createPaletteMap } from './createPaletteMap.ts'
import { paletteNamed } from './ggplotPalettes.ts'
import { compareGroupKeys } from './groupKeys.ts'

import type { ColorScheme, LegendEntry } from './types.ts'

/**
 * How a channel turns a field's values into colors, spelt as Vega-Lite and
 * jbrowse-components' displays spell a scale (jbrowse-components' ADR-238 and
 * ADR-240).
 *
 * - `type`: `ordinal`, the only type so far
 * - `domain`: values in legend order, each taking the `range` color at its own
 *   index; the field's other values follow in natural order
 * - `range`: a list of colors, which colors as many values as it holds
 * - `scheme`: a palette (`ggplot`, `set1`, `dark2`, `okabeito`, `tableau`)
 *   that colors every value, read where `range` is unset
 */
export interface ColorScale {
  type?: 'ordinal'
  domain?: string[]
  range?: string[]
  scheme?: string
}

/** the guide a color scale draws: `title` is the field when unset */
export interface LegendSpec {
  title?: string
}

/**
 * The color object: a channel's `scale` and its `legend`. Records declaring
 * the same scale and legend title over one table share one scale.
 */
export interface ColorSpec {
  scale?: ColorScale
  legend?: LegendSpec
}

/** a channel record: a field read through a color object */
export interface ColorChannel extends ColorSpec {
  field: string
}

export interface ResolvedScale {
  kind: 'categorical'
  colorOf: (value: string) => string | undefined
  legend: LegendEntry[]
}

function scaleColors(scale: ColorScale | undefined, order: string[]) {
  const list = scale?.range
  return list
    ? new Map(order.slice(0, list.length).map((value, i) => [value, list[i]!]))
    : new Map(
        Object.entries(createPaletteMap(order, paletteNamed(scale?.scheme))),
      )
}

/**
 * The scale a channel reads its field through. `values` are the field's
 * values, in any order and with repeats. The domain lists the values `domain`
 * names first, then the rest in natural order, so a value keeps its color when
 * rows are re-ordered, collapsed or filtered.
 *
 * A `scheme`, or no `range` at all, colors every value: past the end of the
 * palette each takes an evenly spaced hue. A `range` leaves the values past its
 * end uncolored, so `{domain, range}` colors the values it names and no others.
 */
export function resolveScale(
  scale: ColorScale | undefined,
  values: Iterable<string>,
): ResolvedScale {
  const present = new Set(values)
  const listed = new Set(scale?.domain)
  const order = [
    ...listed,
    ...[...present].filter(v => !listed.has(v)).toSorted(compareGroupKeys),
  ]
  const colors = scaleColors(scale, order)
  return {
    kind: 'categorical',
    colorOf: (value: string) => colors.get(value),
    legend: order
      .filter(value => present.has(value) && colors.has(value))
      .map(value => ({ id: value, label: value, color: colors.get(value)! })),
  }
}

/** which table a record's field is read from */
export type ScaleTable = 'rows' | 'features'

/**
 * One record's use of a color object: the values its field takes in its
 * table, and for the feature table the values the drawn features carry, which
 * the legend lists
 */
export interface ScaleUse {
  spec: ColorSpec
  field: string
  table: ScaleTable
  values: string[]
  shown?: string[]
}

export interface SharedScale extends ResolvedScale {
  key: string
  title: string
}

/**
 * The key records share a scale under: the table, the scale as declared and
 * the legend's title, which stands in for the field. Two strips over one
 * scheme with no title read two fields and list two legends; naming one title
 * gives them one scale and one legend.
 */
export function declarationKey({
  spec,
  field,
  table,
}: Pick<ScaleUse, 'spec' | 'field' | 'table'>) {
  const { type = 'ordinal', domain, range, scheme } = spec.scale ?? {}
  const title = spec.legend?.title ?? field
  return JSON.stringify([table, type, domain, range, scheme, title])
}

/**
 * Resolves each declaration once over the union of its records' values, so a
 * value two fields share takes one color in both
 */
export function resolveShared(uses: ScaleUse[]) {
  const groups = new Map<string, ScaleUse[]>()
  for (const use of uses) {
    const key = declarationKey(use)
    groups.set(key, [...(groups.get(key) ?? []), use])
  }
  return new Map(
    [...groups].map(([key, group]) => {
      const { spec, field } = group[0]!
      const resolved = resolveScale(
        spec.scale,
        group.flatMap(u => u.values),
      )
      const shown = group[0]!.shown
        ? new Set(group.flatMap(u => u.shown ?? []))
        : undefined
      const scale: SharedScale = {
        ...resolved,
        key,
        title: spec.legend?.title ?? field,
        legend: shown
          ? resolved.legend.filter(entry => shown.has(entry.id))
          : resolved.legend,
      }
      return [key, scale] as const
    }),
  )
}

/**
 * The color a scale gives each value listed, for a reader that keys colors by
 * value, such as the residue letters of a scheme or a text track
 */
export function colorTable(
  scale: ColorScale | undefined,
  values: Iterable<string>,
) {
  return Object.fromEntries(
    resolveScale(scale, values).legend.map(e => [e.id, e.color]),
  )
}

/** the letter-to-color table an object `colorScheme`, a scale, gives */
export function letterColors(scheme: Exclude<ColorScheme, string>) {
  return colorTable(scheme, scheme.domain ?? [])
}

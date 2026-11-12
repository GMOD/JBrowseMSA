import { featureField } from './featureFields.ts'
import { cssColorOf, isCategorical, scaleKind } from './scales.ts'

import type { ColorRecord, ScaleTable } from './scales.ts'
import type { Annotation, HiddenCategory } from './types.ts'

// an identity scale's legend keys each color as `cssColorOf` writes it, so a
// value is looked up the same way
class ColorKeySet extends Set<string> {
  override has(value: string) {
    return super.has(cssColorOf(value))
  }
}

/** the hidden values of each field, per table */
export type HiddenValues = Map<ScaleTable, Map<string, Set<string>>>

/**
 * The hides that apply, by table and field: those whose field a categorical
 * scale in that table reads. A hide on a field no such scale reads waits until
 * one does, as jbrowse-components' `activeHiddenCategories` does.
 */
export function activeHiddenValues(
  records: Pick<ColorRecord, 'channel' | 'table'>[],
  hidden: readonly HiddenCategory[],
): HiddenValues {
  const active: HiddenValues = new Map()
  for (const { channel, table } of records) {
    const kind = scaleKind(channel.scale)
    if (isCategorical(kind)) {
      for (const { field, value } of hidden) {
        if (field === channel.field) {
          const fields = active.get(table) ?? new Map<string, Set<string>>()
          const values =
            fields.get(field) ??
            (kind === 'identity' ? new ColorKeySet() : new Set<string>())
          fields.set(field, values.add(value))
          active.set(table, fields)
        }
      }
    }
  }
  return active
}

/** whether a feature carries a hidden value of any field a scale reads */
export function featureHidden(
  annotation: Annotation,
  hidden: Map<string, Set<string>> | undefined,
) {
  return hidden
    ? [...hidden].some(([field, values]) => {
        const value = featureField(annotation, field)
        return value !== undefined && values.has(value)
      })
    : false
}

/** whether `value` is hidden in every one of `fields` */
export function categoryHiddenIn(
  hidden: readonly HiddenCategory[],
  fields: readonly string[],
  value: string,
) {
  return (
    fields.length > 0 &&
    fields.every(field =>
      hidden.some(h => h.field === field && h.value === value),
    )
  )
}

/**
 * The hides after a click on a legend row keying `value` over `fields`: shown
 * again where every field hides it, else hidden in each, so a row merging
 * several fields toggles them together
 */
export function toggledCategories(
  hidden: readonly HiddenCategory[],
  fields: readonly string[],
  value: string,
): HiddenCategory[] {
  return categoryHiddenIn(hidden, fields, value)
    ? hidden.filter(h => !(h.value === value && fields.includes(h.field)))
    : [
        ...hidden,
        ...fields
          .filter(
            field => !hidden.some(h => h.field === field && h.value === value),
          )
          .map(field => ({ field, value })),
      ]
}

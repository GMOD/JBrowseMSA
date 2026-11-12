// The legend's shape, copied from jbrowse-components
// packages/core/src/ui/legendSpec.ts, which @jbrowse/core 5.0.0-beta.9 ships
// but the hosts the plugin runs on do not.

/** one stop of a color ramp, `offset` in [0, 1] */
export interface RampStop {
  offset: number
  color: string
}

/** the bar a ramp row draws, with its domain ends printed beneath it */
export interface LegendGradient {
  stops: RampStop[]
  minLabel: string
  maxLabel: string
}

/**
 * One row of a color key: a swatch keying `value` in `color`, a ramp's
 * `gradient`, or with neither a line of text
 */
export interface LegendItem {
  value?: string
  label: string
  color?: string
  gradient?: LegendGradient
}

/**
 * One scale's key. `note` is a line under the title about the scale itself,
 * such as a problem with its declaration.
 */
export interface LegendSection {
  id: string
  title?: string
  note?: string
  items: LegendItem[]
}

/** every key the view draws */
export interface LegendSpec {
  title?: string
  sections: LegendSection[]
}

/** how many rows a section lists before a `+N more` line stands for the rest */
export const MAX_LEGEND_ITEMS = 20

/**
 * One row as both renderings stack it: a section's `title`, its `note`, a
 * `swatch` or a `gradient` bar. `hint` is the value a swatch keys, which the
 * overlay shows where it differs from the label.
 */
export interface LegendEntry {
  key: string
  kind: 'title' | 'note' | 'swatch' | 'gradient'
  label: string
  color?: string
  gradient?: LegendGradient
  hint?: string
}

function entryOf(item: LegendItem, key: string, lone?: string): LegendEntry {
  return item.gradient
    ? {
        key,
        kind: 'gradient',
        label: item.label || (lone ?? ''),
        gradient: item.gradient,
      }
    : item.color === undefined
      ? { key, kind: 'note', label: item.label }
      : {
          key,
          kind: 'swatch',
          label: item.label,
          color: item.color,
          hint: item.value,
        }
}

/**
 * The sections flattened into the rows both the overlay and the export stack
 * top to bottom. A title row separates one section from the next, and a lone
 * section needs none, so its ramp bar carries its title instead. A section
 * past MAX_LEGEND_ITEMS rows lists that many and a `+N more` line.
 */
export function legendEntries({ title, sections }: LegendSpec): LegendEntry[] {
  const drawn = sections.filter(s => s.items.length > 0)
  const titled = drawn.length > 1
  return [
    ...(title
      ? [{ key: 'legend-title', kind: 'title' as const, label: title }]
      : []),
    ...drawn.flatMap(section => {
      const { id, items } = section
      const more = items.length - MAX_LEGEND_ITEMS
      const lone = titled ? undefined : section.title
      return [
        ...(titled && section.title
          ? [
              {
                key: `${id}:title`,
                kind: 'title' as const,
                label: section.title,
              },
            ]
          : []),
        ...(section.note === undefined
          ? []
          : [
              { key: `${id}:note`, kind: 'note' as const, label: section.note },
            ]),
        ...items
          .slice(0, MAX_LEGEND_ITEMS)
          .map((item, i) => entryOf(item, `${id}:${i}`, lone)),
        ...(more > 0
          ? [
              {
                key: `${id}:more`,
                kind: 'note' as const,
                label: `+${more} more`,
              },
            ]
          : []),
      ]
    }),
  ]
}

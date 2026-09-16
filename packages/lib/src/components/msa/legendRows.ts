import type { Legend } from '../../types.ts'

export interface LegendRow {
  key: string
  label: string
  color?: string
  hint?: string
}

// the legends flattened into the rows both the overlay and the export stack
// top to bottom. A title row separates one legend from the next, and a lone
// legend needs no title.
export function legendRows(legends: Legend[]): LegendRow[] {
  const titled = legends.length > 1
  return legends.flatMap(legend => [
    ...(titled ? [{ key: legend.id, label: legend.title }] : []),
    ...legend.entries.map(entry => ({
      key: `${legend.id}:${entry.id}`,
      label: entry.label,
      color: entry.color,
      hint: entry.id,
    })),
  ])
}

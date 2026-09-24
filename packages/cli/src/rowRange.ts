export interface RowRange {
  start: number
  end: number
}

/**
 * The `/start-end` suffix a Pfam or Stockholm row name carries when the row is
 * a fragment of its protein, as in `P12931/84-145`: 1-based, inclusive
 * positions in the full sequence.
 */
export function parseRowRange(name: string): RowRange | undefined {
  const match = /\/(\d+)-(\d+)$/.exec(name)
  if (!match) {
    return undefined
  }
  const start = Number(match[1])
  const end = Number(match[2])
  return start >= 1 && end >= start ? { start, end } : undefined
}

/**
 * A span in full-sequence positions moved into the fragment's own positions and
 * clipped to it. Undefined when the span lies outside the fragment.
 */
export function toFragment(
  { start, end }: { start: number; end: number },
  range: RowRange,
) {
  const lo = Math.max(start, range.start)
  const hi = Math.min(end, range.end)
  return lo <= hi
    ? { start: lo - range.start + 1, end: hi - range.start + 1 }
    : undefined
}

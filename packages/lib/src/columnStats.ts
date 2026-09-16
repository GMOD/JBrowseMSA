import type { ColumnCounts } from './columnCounts.ts'

export interface ColumnStats {
  col: number
  total: number
  gaps: number
  gapFraction: number
  conservation: number
  propertyConservation: number | undefined
  consensusLetter: string
  consensusCount: number
  consensusFraction: number
  distribution: [string, number][]
}

/**
 * Summarize one column: consensus residue and its identity fraction, the two
 * conservation scores, gap fraction, and the non-gap residue distribution
 * sorted by count. undefined past the end of the alignment or for a column with
 * no sequences.
 *
 * A module-level function: a getter that reached the method through `this` made
 * TypeScript infer the whole views object to type it, and fell back to `any`.
 */
export function columnStats({
  col,
  colStats,
  conservation,
  propertyConservation,
}: {
  col: number
  colStats: ColumnCounts
  conservation: number[]
  propertyConservation: number[]
}): ColumnStats | undefined {
  if (col >= colStats.numColumns) {
    return undefined
  }
  const total = colStats.total(col)
  if (!total) {
    return undefined
  }
  const gaps = colStats.gapCount(col)
  const distribution = colStats.residueEntries(col).sort((a, b) => b[1] - a[1])
  const consensus = distribution[0]
  return {
    col,
    total,
    gaps,
    gapFraction: gaps / total,
    conservation: conservation[col] ?? 0,
    propertyConservation: propertyConservation[col],
    consensusLetter: consensus?.[0] ?? '',
    consensusCount: consensus?.[1] ?? 0,
    consensusFraction: consensus ? consensus[1] / total : 0,
    distribution,
  }
}

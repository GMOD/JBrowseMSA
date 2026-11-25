import { formatPosition } from '../../rowCoordinates.ts'

import type { RowCoordinates } from '../../types.ts'

// the smallest 1/2/5 x 10^n column step that leaves room for a label
export function rulerStep(colWidth: number, minPixels = 55) {
  let step = 1
  const mantissas = [1, 2, 5]
  for (let i = 0; step * colWidth < minPixels; i++) {
    step = mantissas[i % 3]! * 10 ** Math.floor(i / 3)
  }
  return step
}

export const rulerFontSize = 10

// the px between two ruler labels
const labelGap = 12

export interface RulerTick {
  col: number
  label: string
}

/**
 * The ticks of a ruler numbered in a row's coordinates: each position that is
 * a multiple of a 1/2/5 x 10^n step, over the visible column its residue
 * occupies. The step leaves the widest label `labelGap` px clear of the next
 * where each residue has a column of its own. Hidden columns pack residues
 * closer, so a tick nearer the last labeled one than that is left out.
 */
export function coordinateRulerTicks({
  residueColumns,
  coordinates,
  colWidth,
  visibleCol,
  measure,
}: {
  residueColumns: ArrayLike<number>
  coordinates: RowCoordinates
  colWidth: number
  visibleCol: (globalCol: number) => number | undefined
  measure: (text: string) => number
}) {
  const residues = residueColumns.length
  const labelWidth =
    residues === 0
      ? 0
      : Math.max(
          measure(formatPosition(coordinates, 1)),
          measure(formatPosition(coordinates, residues)),
        )
  const spacing = labelWidth + labelGap
  const step = rulerStep(colWidth, spacing)
  const { start } = coordinates
  const ticks: RulerTick[] = []
  let lastX = -Infinity
  for (
    let position = Math.ceil(start / step) * step;
    position < start + residues;
    position += step
  ) {
    const residue = position - start + 1
    const col = visibleCol(residueColumns[residue - 1]!)
    if (col !== undefined) {
      const x = (col + 0.5) * colWidth
      if (x - lastX >= spacing) {
        ticks.push({ col, label: formatPosition(coordinates, residue) })
        lastX = x
      }
    }
  }
  return { ticks, labelWidth }
}

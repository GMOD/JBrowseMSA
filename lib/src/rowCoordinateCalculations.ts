import { isBlank } from './util'

/**
 * MSA Coordinate Systems:
 *
 * 1. **Global Column (globalCol)**: The column index in the full, unfiltered MSA.
 *    Range: 0 to (MSA width - 1)
 *    This is the "true" column position before any gap-hiding is applied.
 *
 * 2. **Visible Column (visibleCol)**: The column index after hiding gappy columns.
 *    Range: 0 to (numColumns - 1) where numColumns = MSA width - blanks.length
 *    This is what the user sees on screen when "Hide columns w/ N% gaps" is enabled.
 *    When gap hiding is disabled, visibleCol === globalCol.
 *
 * 3. **Sequence Position (seqPos)**: The position within a specific row's ungapped sequence.
 *    Range: 0 to (ungapped sequence length - 1)
 *    This counts only non-gap characters ('-' and '.' are gaps).
 *    Each row can have different seqPos values for the same globalCol due to gaps.
 */

/**
 * Convert a visible column index to a global column index.
 * This is used when translating mouse/screen coordinates to MSA coordinates.
 *
 * @param blanks - Sorted array of global column indices that are hidden
 * @param visibleCol - The visible column index (what the user sees on screen)
 * @returns The corresponding global column index in the full MSA
 */
export function visibleColToGlobalCol(blanks: number[], visibleCol: number) {
  let currentVisibleCol = 0
  let blankArrayIndex = 0
  let globalCol = 0
  const blanksLen = blanks.length

  // Skip any leading blank columns (blanks at the very beginning)
  while (blankArrayIndex < blanksLen && blanks[blankArrayIndex] === globalCol) {
    blankArrayIndex++
    globalCol++
  }

  while (currentVisibleCol < visibleCol) {
    currentVisibleCol++
    globalCol++

    // Skip any blank columns after incrementing
    while (
      blankArrayIndex < blanksLen &&
      blanks[blankArrayIndex] === globalCol
    ) {
      blankArrayIndex++
      globalCol++
    }
  }

  return globalCol
}

/**
 * Convert a global column index to a visible column index.
 * This is the inverse of visibleColToGlobalCol.
 *
 * @param blanks - Sorted array of global column indices that are hidden
 * @param globalCol - The global column index in the full MSA
 * @returns The visible column index, or undefined if the column is hidden
 */
export function globalColToVisibleCol(
  blanks: number[],
  globalCol: number,
): number | undefined {
  // Check if this column is hidden
  // Use binary search since blanks is sorted
  let left = 0
  let right = blanks.length - 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (blanks[mid] === globalCol) {
      return undefined // Column is hidden
    }
    if (blanks[mid]! < globalCol) {
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  // Count blanks before this column (left is now the insertion point)
  const blanksBefore = left
  return globalCol - blanksBefore
}

/**
 * Convert a global column index to a row-specific sequence position.
 * This counts non-gap characters up to the given global column.
 *
 * @param seq - The row's sequence string (including gaps)
 * @param globalCol - The global column index
 * @returns The sequence position (count of non-gap characters before this column)
 */
export function globalColToSeqPos(seq: string, globalCol: number) {
  let seqPos = 0
  let currentCol = 0
  const seqLen = seq.length

  while (currentCol < globalCol && currentCol < seqLen) {
    if (!isBlank(seq[currentCol])) {
      seqPos++
    }
    currentCol++
  }

  return seqPos
}

/**
 * Convert a visible column to a row-specific sequence position.
 * Returns undefined if the position is a gap in the sequence.
 *
 * @param seq - The row's sequence string (including gaps)
 * @param blanks - Sorted array of global column indices that are hidden
 * @param visibleCol - The visible column index
 * @returns The sequence position, or undefined if it's a gap
 */
export function visibleColToSeqPos({
  seq,
  blanks,
  visibleCol,
}: {
  seq: string
  blanks: number[]
  visibleCol: number
}) {
  // First convert the visible column to global column
  const globalCol = visibleColToGlobalCol(blanks, visibleCol)
  const seqLen = seq.length

  // Check if the position in the sequence is a gap
  if (globalCol < seqLen && isBlank(seq[globalCol])) {
    return undefined
  }

  // Count non-gap characters up to the global position
  let seqPos = 0
  for (let i = 0; i < globalCol && i < seqLen; i++) {
    if (!isBlank(seq[i])) {
      seqPos++
    }
  }

  return globalCol < seqLen ? seqPos : undefined
}

/**
 * Convert a visible column to a row-specific sequence position, with row lookup.
 *
 * @param rowName - The name of the row
 * @param visibleCol - The visible column index
 * @param rowMap - Map from row name to sequence string
 * @param blanks - Sorted array of global column indices that are hidden
 * @returns The sequence position, or undefined if row not found or position is a gap
 */
export function visibleColToSeqPosForRow({
  rowName,
  visibleCol,
  rowMap,
  blanks,
}: {
  rowName: string
  visibleCol: number
  rowMap: Map<string, string>
  blanks: number[]
}) {
  const seq = rowMap.get(rowName)
  return seq !== undefined
    ? visibleColToSeqPos({ seq, visibleCol, blanks })
    : undefined
}

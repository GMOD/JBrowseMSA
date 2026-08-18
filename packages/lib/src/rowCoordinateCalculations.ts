import { isBlank } from './util.ts'

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
 * Index of the first element in `[0, len)` for which `pred` holds, over a range
 * where `pred` is false up to some point and true from there on. Both
 * conversions below are that shape, since `blanks` is sorted ascending.
 */
function partitionPoint(len: number, pred: (i: number) => boolean) {
  let left = 0
  let right = len
  while (left < right) {
    const mid = (left + right) >>> 1
    if (pred(mid)) {
      right = mid
    } else {
      left = mid + 1
    }
  }
  return left
}

/**
 * Convert a visible column index to a global column index.
 * This is used when translating mouse/screen coordinates to MSA coordinates.
 *
 * @param blanks - Sorted array of global column indices that are hidden
 * @param visibleCol - The visible column index (what the user sees on screen)
 * @returns The corresponding global column index in the full MSA
 */
export function visibleColToGlobalCol(blanks: number[], visibleCol: number) {
  // `blanks[i] - i` counts the visible columns before the i-th blank, so the
  // first blank with more than visibleCol of them in front of it is the first
  // one sitting past this column. Its index is how many blanks shift it right.
  return (
    visibleCol + partitionPoint(blanks.length, i => blanks[i]! - i > visibleCol)
  )
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
  const blanksBefore = partitionPoint(
    blanks.length,
    i => blanks[i]! >= globalCol,
  )
  return blanks[blanksBefore] === globalCol
    ? undefined // Column is hidden
    : globalCol - blanksBefore
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

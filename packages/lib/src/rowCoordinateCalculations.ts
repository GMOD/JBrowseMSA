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
  const blanksBefore = countBlanksBefore(blanks, globalCol)
  return blanks[blanksBefore] === globalCol
    ? undefined // Column is hidden
    : globalCol - blanksBefore
}

function countBlanksBefore(blanks: number[], globalCol: number) {
  return partitionPoint(blanks.length, i => blanks[i]! >= globalCol)
}

/**
 * How many visible columns come before a global column. For a visible column
 * that is its own visible index; for a hidden one it is the index of the next
 * visible column, i.e. where the hidden column collapses to.
 *
 * Spans use this, since globalColToVisibleCol drops a span whenever either end
 * lands in a hidden column.
 *
 * @param blanks - Sorted array of global column indices that are hidden
 * @param globalCol - The global column index in the full MSA
 */
export function visibleColsBefore(blanks: number[], globalCol: number) {
  return globalCol - countBlanksBefore(blanks, globalCol)
}

/**
 * The ungapped position a row holds at a global column, or undefined when that
 * column is a gap in the row or past its end.
 *
 * Binary-searches the row's ascending seqPos index; it runs on every mouse
 * move, and scanning a 30k-column row per event takes the whole frame.
 *
 * @param index - The row's seqPos -> global column index (buildSeqPosIndex)
 * @param globalCol - The global column index in the full MSA
 */
export function seqPosOfGlobalCol(
  index: Int32Array | undefined,
  globalCol: number,
) {
  if (!index) {
    return undefined
  }
  const seqPos = partitionPoint(index.length, i => index[i]! >= globalCol)
  return index[seqPos] === globalCol ? seqPos : undefined
}

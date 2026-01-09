import { isBlank } from './util'

/**
 * Convert a sequence position (ungapped, 0-based) to a global column index.
 * This finds the global column that contains the Nth non-gap character.
 *
 * @param row - The row's sequence string (including gaps)
 * @param seqPos - The sequence position (0-based count of non-gap characters)
 * @returns The global column index containing the seqPos-th non-gap character
 *
 * @example
 * // Row: "A-TG-C" (A at 0, T at 2, G at 3, C at 5)
 * seqPosToGlobalCol({ row: "A-TG-C", seqPos: 0 }) // → 0 (A)
 * seqPosToGlobalCol({ row: "A-TG-C", seqPos: 1 }) // → 2 (T)
 * seqPosToGlobalCol({ row: "A-TG-C", seqPos: 2 }) // → 3 (G)
 * seqPosToGlobalCol({ row: "A-TG-C", seqPos: 3 }) // → 5 (C)
 */
export function seqPosToGlobalCol({
  row,
  seqPos,
}: {
  row: string
  seqPos: number
}) {
  let nonGapCount = 0
  let globalCol = 0
  // Find the seqPos-th non-gap character
  while (globalCol < row.length) {
    if (!isBlank(row[globalCol])) {
      if (nonGapCount === seqPos) {
        return globalCol
      }
      nonGapCount++
    }
    globalCol++
  }
  // If seqPos is 0 and we didn't find any non-gap character, return 0
  // Otherwise return globalCol (which is row.length at this point)
  return seqPos === 0 ? 0 : globalCol
}

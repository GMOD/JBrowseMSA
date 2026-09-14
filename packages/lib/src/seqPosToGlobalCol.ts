/**
 * The global column of every ungapped sequence position in a row, i.e.
 * index[seqPos] is the column holding the seqPos-th non-gap character.
 *
 * The domain overlay resolves one position per feature per row on every redraw,
 * and scanning the row for each would be quadratic.
 *
 * @example
 * // Row: "A-TG-C" (A at 0, T at 2, G at 3, C at 5)
 * buildSeqPosIndex('A-TG-C') // → [0, 2, 3, 5]
 */
export function buildSeqPosIndex(row: string) {
  const index = new Int32Array(row.length)
  let n = 0
  for (let col = 0; col < row.length; col++) {
    // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
    if (!((row.charCodeAt(col) - 45) >>> 0 <= 1)) {
      index[n++] = col
    }
  }
  // slice, not subarray: a subarray keeps the whole row-length buffer alive,
  // and a gappy alignment's indexes are held for as long as the parse is
  return index.slice(0, n)
}

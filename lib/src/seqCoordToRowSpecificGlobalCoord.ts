import { isBlank } from './util'

export function seqCoordToRowSpecificGlobalCoord({
  row,
  position,
}: {
  row: string
  position: number
}) {
  let k = 0
  let i = 0
  // Find the position-th non-gap character
  while (i < row.length) {
    if (!isBlank(row[i])) {
      if (k === position) {
        return i
      }
      k++
    }
    i++
  }
  // If position is 0 and we didn't find any non-gap character, return 0
  // Otherwise return i (which is row.length at this point)
  return position === 0 ? 0 : i
}

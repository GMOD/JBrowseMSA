import { isBlank } from './util'

export function mouseOverCoordToGlobalCoord(
  blanks: number[],
  position: number,
) {
  let mousePosition = 0 // Current position in mouse coordinates
  let blankArrayIndex = 0 // Current index in the blanks array
  let globalPosition = 0 // Position in global coordinates (return value)
  const blanksLen = blanks.length

  // Iterate until we reach the target mouse position
  while (mousePosition < position) {
    // Skip any blank positions in the sequence
    while (
      blankArrayIndex < blanksLen &&
      blanks[blankArrayIndex]! - 1 === globalPosition
    ) {
      blankArrayIndex++
      globalPosition++
    }

    // Move to next position
    mousePosition++
    globalPosition++
  }

  return globalPosition
}

export function globalCoordToRowSpecificCoord(seq: string, position: number) {
  // Initialize counter for non-gap characters
  let nonGapCount = 0
  // Initialize position counter
  let currentPosition = 0
  const sequenceLength = seq.length

  // Iterate until we reach the target position or end of sequence
  while (currentPosition < position && currentPosition < sequenceLength) {
    // If current character is not a gap, increment the non-gap counter
    if (!isBlank(seq[currentPosition])) {
      nonGapCount++
    }
    currentPosition++
  }

  return nonGapCount
}

export function mouseOverCoordToGapRemovedRowCoord({
  rowName,
  position,
  rowMap,
  blanks,
}: {
  rowName: string
  position: number
  rowMap: Map<string, string>
  blanks: number[]
}) {
  const seq = rowMap.get(rowName)
  return seq !== undefined
    ? mouseOverCoordToGapRemovedCoord({
        seq,
        position,
        blanks,
      })
    : undefined
}

export function mouseOverCoordToGapRemovedCoord({
  seq,
  blanks,
  position,
}: {
  seq: string
  blanks: number[]
  position: number
}) {
  // First convert the mouse position to global coordinates
  const globalPos = mouseOverCoordToGlobalCoord(blanks, position)
  const seqLen = seq.length

  // Check if the position in the sequence is a gap
  if (globalPos < seqLen && isBlank(seq[globalPos])) {
    return undefined
  }

  // Count non-gap characters up to the global position
  let nonGapCount = 0
  for (let i = 0; i < globalPos && i < seqLen; i++) {
    if (!isBlank(seq[i])) {
      nonGapCount++
    }
  }

  // If we're at a valid position, return the count of non-gap characters
  return globalPos < seqLen ? nonGapCount : undefined
}

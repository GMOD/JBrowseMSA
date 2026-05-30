// The half-open range of alignment columns [xStart, xEnd) intersecting a block
// of width blockWidth at horizontal offset offsetX. X-axis counterpart to
// getVisibleLeaves.
export function visibleColRange({
  offsetX,
  blockWidth,
  colWidth,
}: {
  offsetX: number
  blockWidth: number
  colWidth: number
}) {
  return {
    xStart: Math.max(0, Math.floor(offsetX / colWidth)),
    xEnd: Math.max(0, Math.ceil((offsetX + blockWidth) / colWidth)),
  }
}

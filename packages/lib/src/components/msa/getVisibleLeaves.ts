import type { MsaViewModel } from '../../model.ts'

// The slice of leaves whose rows intersect a block of height blockSizeY at
// vertical offset offsetY, padded by one row on each side.
export function getVisibleLeaves({
  model,
  offsetY,
  blockSizeY,
}: {
  model: MsaViewModel
  offsetY: number
  blockSizeY: number
}) {
  const { leaves, rowHeight } = model
  const yStart = Math.max(0, Math.floor((offsetY - rowHeight) / rowHeight))
  const yEnd = Math.max(
    0,
    Math.ceil((offsetY + blockSizeY + rowHeight) / rowHeight),
  )
  return leaves.slice(yStart, yEnd)
}

import type { MsaViewModel } from '../model.ts'

// The half-open range of rows [yStart, yEnd) whose leaves intersect a block of
// height blockSizeY at vertical offset offsetY, padded by one row on each side.
// Y-axis counterpart to visibleColRange.
export function visibleRowRange({
  model,
  offsetY,
  blockSizeY,
}: {
  model: MsaViewModel
  offsetY: number
  blockSizeY: number
}) {
  const { rowHeight } = model
  return {
    yStart: Math.max(0, Math.floor((offsetY - rowHeight) / rowHeight)),
    yEnd: Math.max(
      0,
      Math.ceil((offsetY + blockSizeY + rowHeight) / rowHeight),
    ),
  }
}

// The leaves in that range.
export function getVisibleLeaves({
  model,
  offsetY,
  blockSizeY,
}: {
  model: MsaViewModel
  offsetY: number
  blockSizeY: number
}) {
  const { yStart, yEnd } = visibleRowRange({ model, offsetY, blockSizeY })
  return model.leaves.slice(yStart, yEnd)
}

// Returns the block offsets (in pixels) needed to cover the viewport along one
// axis. mapSize/viewportPos/viewportSize are all in pixels. The clamp pins the
// block set to the content edge so an over-scroll past the end still fills the
// viewport rather than leaving a gap.
export function calculateBlocks({
  mapSize,
  blockSize,
  viewportPos,
  viewportSize,
}: {
  mapSize: number
  blockSize: number
  viewportPos: number
  viewportSize: number
}) {
  const clamped = Math.max(0, Math.min(viewportPos, mapSize - viewportSize))
  const minTile = Math.floor(clamped / blockSize)
  const maxTile = Math.floor((clamped + viewportSize - 1) / blockSize)

  const blocks = []
  for (let tile = minTile; tile <= maxTile; tile++) {
    blocks.push(tile * blockSize)
  }
  return blocks
}

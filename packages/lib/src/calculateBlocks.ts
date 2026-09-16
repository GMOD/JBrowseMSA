// Returns the block offsets (in pixels) needed to cover the viewport along one
// axis. mapSize/viewportPos/viewportSize are all in pixels. The clamp pins the
// block set to the content edge, so an over-scroll past the end still fills
// the viewport, and content smaller than the viewport mounts only the blocks
// it covers: none for a tree-only figure with zero columns.
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
  const end = Math.min(clamped + viewportSize, mapSize)
  const minTile = Math.floor(clamped / blockSize)
  const maxTile = Math.ceil(end / blockSize) - 1

  const blocks = []
  for (let tile = minTile; tile <= maxTile; tile++) {
    blocks.push(tile * blockSize)
  }
  return blocks
}

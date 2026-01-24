export function blocksY({
  mapHeight,
  blockSize,
  viewportY,
  viewportHeight,
}: {
  mapHeight: number
  blockSize: number
  viewportY: number
  viewportHeight: number
}) {
  const clampedViewportY = Math.max(
    0,
    Math.min(viewportY, mapHeight * blockSize - viewportHeight),
  )

  // Calculate visible tile ranges
  const minTileY = Math.floor(clampedViewportY / blockSize)
  const maxTileY = Math.floor(
    (clampedViewportY + viewportHeight - 1) / blockSize,
  )

  // Generate list of visible tiles
  const blocksY = []
  for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
    blocksY.push(tileY * blockSize)
  }

  return blocksY
}

export function blocksX({
  mapWidth,
  blockSize,
  viewportX,
  viewportWidth,
}: {
  mapWidth: number
  blockSize: number
  viewportX: number
  viewportWidth: number
}) {
  const clampedViewportX = Math.max(
    0,
    Math.min(viewportX, mapWidth - viewportWidth),
  )

  const minTileX = Math.floor(clampedViewportX / blockSize)
  const maxTileX = Math.floor(
    (clampedViewportX + viewportWidth - 1) / blockSize,
  )
  const blocksX = []
  for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
    blocksX.push(tileX * blockSize)
  }

  return blocksX
}

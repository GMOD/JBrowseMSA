/**
 * Assigns each of one row's bands a lane: the first lane whose last band ends
 * before this one starts, so only bands that actually overlap stack. A row of
 * adjacent exons packs into a single lane; a family with a domain nested inside
 * it takes two.
 *
 * Packing runs left to right, but the result keeps the input's largest-first
 * paint order. `laneCount` is the row's depth, which the renderer divides the
 * row height by so a deep stack stays inside its own row.
 *
 * The coordinates are whatever the caller packs in: alignment columns for the
 * overlay, residue positions for a `features` row panel.
 */
export function packDomainLanes<T extends { startCol: number; endCol: number }>(
  bands: T[],
): (T & { lane: number; laneCount: number })[] {
  const laneEnds: number[] = []
  const lanes = new Array<number>(bands.length)
  const byStart = bands
    .map((_, i) => i)
    .sort((a, b) => bands[a]!.startCol - bands[b]!.startCol)

  for (const i of byStart) {
    const { startCol, endCol } = bands[i]!
    const found = laneEnds.findIndex(end => end <= startCol)
    const lane = found === -1 ? laneEnds.length : found
    laneEnds[lane] = endCol
    lanes[i] = lane
  }

  return bands.map((band, i) => ({
    ...band,
    lane: lanes[i]!,
    laneCount: laneEnds.length,
  }))
}

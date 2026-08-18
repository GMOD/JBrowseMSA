import type { DomainBand } from '../../types.ts'

/**
 * Left-to-right cursor over one row's domain bands, answering "which band is
 * drawn on top at this column" — the fill a letter there has to contrast
 * against.
 *
 * Not simply the first band covering the column. The overlay paints in
 * `domainBands` order, largest first, so where signatures nest — a family
 * enclosing a domain, which InterProScan emits routinely — the box a reader
 * actually sees is the last one painted over that column. `stackIndex` is that
 * paint order.
 *
 * `bands` must be sorted by start column (`domainBandsByStart`), and columns
 * must be visited in increasing order, which is what the block renderer does.
 * Both keep this to one pass over the bands per row rather than a scan per cell.
 */
export function domainBandCursor(bands: DomainBand[] | undefined) {
  let next = 0
  let active: DomainBand[] = []

  return (col: number) => {
    if (!bands) {
      return undefined
    }
    while (next < bands.length && bands[next]!.startCol <= col) {
      active.push(bands[next]!)
      next++
    }
    if (active.some(band => band.endCol <= col)) {
      active = active.filter(band => band.endCol > col)
    }
    let top: DomainBand | undefined
    for (const band of active) {
      if (!top || band.stackIndex > top.stackIndex) {
        top = band
      }
    }
    return top
  }
}

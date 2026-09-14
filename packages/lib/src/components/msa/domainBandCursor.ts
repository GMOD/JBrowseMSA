import type { DomainBand } from '../../types.ts'

/**
 * Left-to-right cursor over one row's domain bands that returns the band drawn
 * on top at a column, for a letter's contrast color.
 *
 * The overlay paints in `domainBands` order, largest first, so where signatures
 * nest (InterProScan often emits a family enclosing a domain) the visible band
 * is the last one painted. `stackIndex` is that paint order.
 *
 * `bands` must be sorted by start column (`domainBandsByStart`) and columns
 * visited in increasing order, which keeps this to one pass per row.
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

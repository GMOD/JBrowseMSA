import { consecutiveRuns } from '../util.ts'

import type { RenderCtx } from './renderCtx.ts'

const runsByIndices = new WeakMap<number[], [number, number][]>()

/**
 * Row indices in any order as inclusive runs of consecutive rows. Memoized per
 * array, since the overlays redraw the same computed set on every pointer move
 * and a hovered root covers every row of the tree.
 */
export function rowRuns(indices: number[]) {
  const cached = runsByIndices.get(indices)
  if (cached) {
    return cached
  }
  const runs = consecutiveRuns([...indices].toSorted((a, b) => a - b))
  runsByIndices.set(indices, runs)
  return runs
}

export function inRuns(runs: [number, number][], row: number) {
  return runs.some(([first, last]) => row >= first && row <= last)
}

/**
 * A horizontal band across rows of a panel. `top` is the canvas y of row 0,
 * `x` and `width` the panel's extent, and `yMin`/`yMax` the canvas rows worth
 * drawing, so a band reaching off the canvas is cut at its edge.
 */
export interface RowBandArea {
  ctx: RenderCtx
  rowHeight: number
  top: number
  x: number
  width: number
  yMin: number
  yMax: number
}

/** one rect per run of rows, cut to the area's visible rows */
export function fillRowRuns(area: RowBandArea, runs: [number, number][]) {
  const { ctx, rowHeight, top, x, width, yMin, yMax } = area
  for (const [first, last] of runs) {
    const y0 = Math.max(yMin, top + first * rowHeight)
    const y1 = Math.min(yMax, top + (last + 1) * rowHeight)
    if (y1 > y0) {
      ctx.fillRect(x, y0, width, y1 - y0)
    }
  }
}

/** the first and last rows the area's visible canvas rows cross */
export function visibleRowRange({ rowHeight, top, yMin, yMax }: RowBandArea) {
  return [
    Math.max(0, Math.floor((yMin - top) / rowHeight)),
    Math.ceil((yMax - top) / rowHeight),
  ] as const
}

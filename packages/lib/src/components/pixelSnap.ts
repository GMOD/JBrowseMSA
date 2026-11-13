import type { RenderCtx } from './renderCtx.ts'

type FillCtx = Pick<RenderCtx, 'fillRect'>

function isRasterCanvas(ctx: FillCtx): ctx is CanvasRenderingContext2D {
  return 'canvas' in ctx && 'getTransform' in ctx
}

// an axis's [start, end), moved to the nearest device pixels when the span
// covers at least one; the bias settles an edge at half a device pixel the same
// way whether float error put it just above or just below
function snapSpan(start: number, size: number, scale: number, shift: number) {
  const snap = (v: number) =>
    (Math.round(v * scale + shift + 1e-6) - shift) / scale
  return size * scale >= 1
    ? { lo: snap(start), hi: snap(start + size) }
    : { lo: start, hi: start + size }
}

/**
 * A fillRect for cells that tile edge to edge, such as a track's columns or a
 * strip's rows. On a canvas, an edge that lands partway into a device pixel is
 * antialiased against the background from both neighbors, which leaves a light
 * seam between every pair of cells at a fractional devicePixelRatio. This moves
 * each edge to a device pixel under the transform in place when it is called.
 *
 * A cell under one device pixel keeps its exact edges, so a dense overview
 * blends its cells rather than dropping some, and an SVG export keeps the exact
 * geometry throughout.
 */
export function cellFillRect(ctx: FillCtx) {
  if (isRasterCanvas(ctx)) {
    const { a, d, e, f } = ctx.getTransform()
    return (x: number, y: number, w: number, h: number) => {
      const sx = snapSpan(x, w, a, e)
      const sy = snapSpan(y, h, d, f)
      ctx.fillRect(sx.lo, sy.lo, sx.hi - sx.lo, sy.hi - sy.lo)
    }
  } else {
    return (x: number, y: number, w: number, h: number) => {
      ctx.fillRect(x, y, w, h)
    }
  }
}

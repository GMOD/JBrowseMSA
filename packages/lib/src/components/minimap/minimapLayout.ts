import type { MsaViewModel } from '../../model.ts'

export const MINIMAP_BAR_HEIGHT = 12

/**
 * Viewport-rectangle and trapezoid geometry for the minimap, shared by the
 * interactive Minimap and the static MinimapSVG. Both span the alignment canvas
 * exactly -- a minimap drawn a different width than the columns it maps puts
 * its viewport rectangle over the wrong ones.
 */
export function getMinimapLayout(model: MsaViewModel) {
  const { scrollX, minimapHeight, totalWidth, msaCanvasWidth } = model
  const unit = totalWidth > 0 ? msaCanvasWidth / totalWidth : 0
  const s = -scrollX * unit
  // the rectangle marks the visible slice of the alignment, so it can never be
  // wider than the bar itself
  const w = Math.min(msaCanvasWidth, Math.max(msaCanvasWidth * unit, 20))
  const polygonHeight = minimapHeight - MINIMAP_BAR_HEIGHT
  const polygonPoints = `${s + w},0 ${s},0 0,${polygonHeight} ${msaCanvasWidth},${polygonHeight}`
  return { unit, s, w, polygonHeight, polygonPoints }
}

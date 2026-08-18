import type { MsaViewModel } from '../../model.ts'

export const MINIMAP_BAR_HEIGHT = 12

/**
 * Viewport-rectangle and trapezoid geometry for a minimap drawn `minimapWidth`
 * pixels wide, shared by the interactive Minimap and the static MinimapSVG.
 *
 * The width is a parameter rather than read off the model because the two
 * differ: on screen the minimap sits over the alignment canvas, while the SVG
 * export lays the whole figure out on its own grid. What the rectangle *marks*
 * is always the on-screen viewport, so that part comes from the model.
 */
export function getMinimapLayout(model: MsaViewModel, minimapWidth: number) {
  const { scrollX, minimapHeight, totalWidth, msaCanvasWidth } = model
  const unit = totalWidth > 0 ? minimapWidth / totalWidth : 0
  const s = -scrollX * unit
  const w = Math.max(msaCanvasWidth * unit, 20)
  const polygonHeight = minimapHeight - MINIMAP_BAR_HEIGHT
  const polygonPoints = `${s + w},0 ${s},0 0,${polygonHeight} ${minimapWidth},${polygonHeight}`
  return { unit, s, w, polygonHeight, polygonPoints }
}

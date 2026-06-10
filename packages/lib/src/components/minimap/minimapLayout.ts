import type { MsaViewModel } from '../../model.ts'

export const MINIMAP_BAR_HEIGHT = 12

// viewport-rectangle and trapezoid geometry shared by the interactive Minimap
// and the static MinimapSVG (used for SVG export)
export function getMinimapLayout(model: MsaViewModel) {
  const { scrollX, msaAreaWidth, minimapHeight, colWidth, numColumns } = model
  const unit = msaAreaWidth / numColumns / colWidth
  const left = -scrollX
  const s = left * unit
  const e = (left + msaAreaWidth) * unit
  const w = Math.max(e - s, 20)
  const polygonHeight = minimapHeight - MINIMAP_BAR_HEIGHT
  const polygonPoints = `${s + w},0 ${s},0 0,${polygonHeight} ${msaAreaWidth},${polygonHeight}`
  return { unit, s, w, polygonHeight, polygonPoints }
}

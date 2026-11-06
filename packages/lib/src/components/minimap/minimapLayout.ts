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

/**
 * The domain overlay's boxes scaled onto the minimap bar, in the colors the
 * alignment draws them, so the overview shows the domains the alignment does.
 * Empty unless the domains fill the cells.
 *
 * The rows share the bar's height in lanes at least a pixel tall, and a lane
 * keeps one rect per distinct pixel span and color, so an alignment of 200k
 * rows with the same domains draws a few rects per lane.
 */
export function minimapDomainRects(
  model: MsaViewModel,
  width: number,
  height: number,
) {
  const { cellFill, domainBands, featureColors, leaves, numColumns } = model
  if (cellFill !== 'domain' || numColumns <= 0 || leaves.length === 0) {
    return []
  }
  const colUnit = width / numColumns
  const laneCount = Math.min(leaves.length, Math.max(1, Math.floor(height)))
  const laneHeight = height / laneCount
  const lanes = Array.from({ length: laneCount }, () => new Set<string>())
  const rects: { x: number; y: number; w: number; h: number; fill: string }[] =
    []
  leaves.forEach((leaf, row) => {
    const lane = Math.floor((row * laneCount) / leaves.length)
    for (const band of domainBands.get(leaf.data.name) ?? []) {
      const x = Math.round(band.startCol * colUnit)
      const w = Math.max(1, Math.round(band.endCol * colUnit) - x)
      const fill = featureColors.get(band.annotation)?.fill ?? 'grey'
      const key = `${x},${w},${fill}`
      if (!lanes[lane]!.has(key)) {
        lanes[lane]!.add(key)
        rects.push({ x, y: lane * laneHeight, w, h: laneHeight, fill })
      }
    }
  })
  return rects
}

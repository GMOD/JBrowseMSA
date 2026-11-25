import { labelFitFontSize, rowPanelHeaderHeight } from '../../constants.ts'
import { measureTextCanvas } from '../../measureTextCanvas.ts'
import { axisHeight, drawAxis } from '../axis.ts'

import type { PanelAxis } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

/**
 * The header band is the same height at every row height, so a header draws
 * at the rows' font up to the font of a 16px row
 */
export function headerFontSize(rowFontSize: number) {
  return Math.min(rowFontSize, labelFitFontSize)
}

/**
 * Whether a header writes across its panel: one with an axis, one wider than
 * the band is tall, and one whose text fits the panel's width do. A narrower
 * panel turns a longer header on its side.
 */
export function headerRunsAcross(
  panel: { width: number; header: string; axis?: PanelAxis },
  fontSize: number,
) {
  return (
    !!panel.axis ||
    panel.width > rowPanelHeaderHeight ||
    measureTextCanvas(panel.header, fontSize) <= panel.width - 4
  )
}

/**
 * The height of the axis at the foot of the header band, where a panel with a
 * value scale draws it under its header
 */
export const headerAxisHeight = axisHeight + 2

/**
 * A panel's axis at the top left of a context `headerAxisHeight` tall, its
 * line along the bottom edge over the panel it measures
 */
export function drawHeaderAxis(ctx: RenderCtx, axis: PanelAxis, color: string) {
  ctx.translate(0, headerAxisHeight - 0.5)
  drawAxis({
    ctx,
    scale: axis.scale,
    extent: axis.extent,
    orientation: 'top',
    color,
    format: axis.format,
  })
}

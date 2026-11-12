import { rowPanelHeaderHeight } from '../../constants.ts'
import { axisHeight, drawAxis } from '../axis.ts'

import type { PanelAxis } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

export function headerRunsAcross(panelWidth: number) {
  return panelWidth > rowPanelHeaderHeight
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

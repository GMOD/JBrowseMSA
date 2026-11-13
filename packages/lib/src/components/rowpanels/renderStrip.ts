import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { cellFillRect } from '../pixelSnap.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedStripPanel } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

/**
 * One cell per row of a `strip` panel, in the color its field takes through
 * the panel's scale. A row the table has no value for leaves the cell empty.
 */
export function renderStrip({
  ctx,
  model,
  panel,
  offsetY,
  blockSizeYOverride,
  highResScaleFactorOverride,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  panel: ResolvedStripPanel
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { rowHeight, blockSize, highResScaleFactor } = model
  const by = blockSizeYOverride ?? blockSize
  ctx.resetTransform()
  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.scale(k, k)
  ctx.translate(0, -offsetY)
  const fillCell = cellFillRect(ctx)
  for (const leaf of getVisibleLeaves({ model, offsetY, blockSizeY: by })) {
    const color = panel.colors.get(leaf.data.name)
    if (color) {
      ctx.fillStyle = color
      // leaf.x is the row's center, at rowHeight*(index+0.5)
      fillCell(0, leaf.x! - rowHeight / 2, panel.width, rowHeight)
    }
  }
}

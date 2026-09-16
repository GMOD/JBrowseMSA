import { getVisibleLeaves } from '../getVisibleLeaves.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedRowPanel } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

interface StripArgs {
  ctx: RenderCtx
  model: MsaViewModel
  panel: ResolvedRowPanel
  x: number
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}

/**
 * One cell per row of a `strip` panel, in the color its field takes through
 * the panel's scale. A row the table has no value for leaves the cell empty.
 *
 * `x` is the panel's left edge in the context: the live view gives each panel
 * a canvas of its own and passes 0, and the export packs every panel into one
 * context and passes the panel's own offset.
 */
export function renderStrip({
  ctx,
  model,
  panel,
  x,
  offsetY,
  blockSizeYOverride,
  highResScaleFactorOverride,
}: StripArgs) {
  const { rowHeight, blockSize, highResScaleFactor } = model
  const by = blockSizeYOverride ?? blockSize
  ctx.resetTransform()
  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.scale(k, k)
  ctx.translate(x, -offsetY)
  for (const leaf of getVisibleLeaves({ model, offsetY, blockSizeY: by })) {
    const color = panel.colors.get(leaf.data.name)
    if (color) {
      ctx.fillStyle = color
      // leaf.x is the row's center, at rowHeight*(index+0.5)
      ctx.fillRect(0, leaf.x! - rowHeight / 2, panel.width, rowHeight)
    }
  }
}

/** every row panel side by side in one context, for the SVG export */
export function renderRowPanels({
  ctx,
  model,
  offsetY,
  blockSizeYOverride,
  highResScaleFactorOverride,
}: Omit<StripArgs, 'panel' | 'x'>) {
  for (const panel of model.resolvedRowPanels) {
    renderStrip({
      ctx,
      model,
      panel,
      x: panel.offsetX,
      offsetY,
      blockSizeYOverride,
      highResScaleFactorOverride,
    })
  }
}

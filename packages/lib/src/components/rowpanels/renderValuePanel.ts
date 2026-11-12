import { valuePosition } from '../axis.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedValuePanel } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

// the fill of a mark no `encoding.color` colors, the bar track's default
const unencodedMark = 'gray'

// a bar keeps this share of its row clear, so adjacent bars read apart
const barGap = 0.2

/**
 * A bar or a dot per row at the value its field holds, along the panel's
 * axis. A bar runs from the axis position of 0, or from the scale's low end
 * where 0 lies outside it, which a log scale's always does. A row with no
 * number draws nothing.
 */
export function renderValuePanel({
  ctx,
  model,
  panel,
  offsetY,
  blockSizeYOverride,
  highResScaleFactorOverride,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  panel: ResolvedValuePanel
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { rowHeight, blockSize, highResScaleFactor } = model
  const by = blockSizeYOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(0, -offsetY)
  const { scale, extent } = panel.axis
  const at = valuePosition(scale, extent)
  const base = scale.type === 'log' ? extent[0] : at(0)
  const barHeight = Math.max(1, rowHeight * (1 - barGap))
  const radius = Math.min(panel.size, rowHeight) / 2
  for (const leaf of getVisibleLeaves({ model, offsetY, blockSizeY: by })) {
    const { name } = leaf.data
    const value = panel.values.get(name)
    if (value !== undefined && !panel.hiddenRows.has(name)) {
      const x = at(value)
      // leaf.x is the row's center, at rowHeight*(index+0.5)
      const y = leaf.x!
      ctx.fillStyle = panel.colors.get(name) ?? unencodedMark
      if (panel.kind === 'bar') {
        ctx.fillRect(
          Math.min(base, x),
          y - barHeight / 2,
          Math.abs(x - base),
          barHeight,
        )
      } else {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }
}

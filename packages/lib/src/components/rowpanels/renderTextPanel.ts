import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { ellipsize } from '../tree/ellipsize.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedTextPanel } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

const padding = 2

/**
 * Each row's text in the panel's width at the tree labels' font size, cut in
 * the middle where it runs longer, in the color `encoding.color` gives it or
 * the theme's text color
 */
export function renderTextPanel({
  ctx,
  model,
  theme,
  panel,
  offsetY,
  blockSizeYOverride,
  highResScaleFactorOverride,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  panel: ResolvedTextPanel
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { fontSize, blockSize, highResScaleFactor } = model
  const by = blockSizeYOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(0, -offsetY)
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const room = panel.width - 2 * padding
  for (const leaf of getVisibleLeaves({ model, offsetY, blockSizeY: by })) {
    const { name } = leaf.data
    const value = panel.texts.get(name)
    if (value !== undefined && !panel.hiddenRows.has(name)) {
      const { text } = ellipsize(t => ctx.measureText(t).width, value, room)
      ctx.fillStyle = panel.colors.get(name) ?? theme.palette.text.primary
      // fontSize/4 below the row center, the baseline the tree labels share
      ctx.fillText(text, padding, leaf.x! + fontSize / 4)
    }
  }
}

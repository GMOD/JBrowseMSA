import { labelFitFontSize } from '../../constants.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { ellipsis, ellipsize } from '../tree/ellipsize.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedTextPanel } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

const padding = 2

/**
 * The font a text panel draws at: the rows' font where the widest text fits
 * the panel at it, and otherwise the largest that fits, down to the font of a
 * 16px row. A panel sized for the default rows keeps its texts whole at any
 * row height.
 */
export function textPanelFontSize(
  panel: Pick<ResolvedTextPanel, 'width' | 'widestText'>,
  rowFontSize: number,
) {
  const room = panel.width - 2 * padding
  const fitting =
    panel.widestText > 0
      ? Math.floor((labelFitFontSize * room) / panel.widestText)
      : rowFontSize
  return Math.max(
    Math.min(rowFontSize, labelFitFontSize),
    Math.min(rowFontSize, fitting),
  )
}

/**
 * Each row's text in the panel's width at `textPanelFontSize`, cut in the
 * middle where it runs longer, and an ellipsis alone where not even that fits,
 * in the color `encoding.color` gives it or the theme's text color
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
  const { blockSize, highResScaleFactor } = model
  const fontSize = textPanelFontSize(panel, model.fontSize)
  const by = blockSizeYOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(0, -offsetY)
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const room = panel.width - 2 * padding
  const measure = (t: string) => ctx.measureText(t).width
  const cut = measure(ellipsis) <= room ? ellipsis : ''
  for (const leaf of getVisibleLeaves({ model, offsetY, blockSizeY: by })) {
    const { name } = leaf.data
    const value = panel.texts.get(name)
    if (value !== undefined && !panel.hiddenRows.has(name)) {
      const { text } = ellipsize(measure, value, room)
      ctx.fillStyle = panel.colors.get(name) ?? theme.palette.text.primary
      // fontSize/4 below the row center, the baseline the tree labels share
      ctx.fillText(text || (value && cut), padding, leaf.x! + fontSize / 4)
    }
  }
}

import { renderFeaturePanel } from './renderFeaturePanel.ts'
import { renderStrip } from './renderStrip.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedRowPanel } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

interface PanelArgs {
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  panel: ResolvedRowPanel
  x: number
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}

/**
 * One row panel, by kind. `x` is the panel's left edge in the context: the
 * live view gives each panel a canvas of its own and passes 0, and the export
 * packs every panel into one context and passes the panel's own offset.
 */
export function renderRowPanel({ panel, ...rest }: PanelArgs) {
  if (panel.kind === 'features') {
    renderFeaturePanel({ panel, ...rest })
  } else {
    renderStrip({ panel, ...rest })
  }
}

/** every row panel side by side in one context, for the SVG export */
export function renderRowPanels({
  model,
  ...rest
}: Omit<PanelArgs, 'panel' | 'x'>) {
  for (const panel of model.resolvedRowPanels) {
    renderRowPanel({ model, panel, x: panel.offsetX, ...rest })
  }
}

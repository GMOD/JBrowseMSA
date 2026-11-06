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
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}

/**
 * One row panel, by kind, at the left edge of its own context: a canvas per
 * panel on screen, and a clipped group per panel in the export.
 */
export function renderRowPanel({ panel, ...rest }: PanelArgs) {
  if (panel.kind === 'features') {
    renderFeaturePanel({ panel, ...rest })
  } else {
    renderStrip({ panel, ...rest })
  }
}

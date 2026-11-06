import { contrastTextFn } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { drawFeatureSpans, spanRows } from '../msa/drawFeatureSpans.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type {
  NodeWithIds,
  ResolvedFeaturePanel,
  RowPanelSpan,
} from '../../types.ts'
import type { SpanSource } from '../msa/drawFeatureSpans.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

// a span keeps a pixel clear above and below it, so stacked lanes and adjacent
// rows read apart
const rowPadding = 2

/**
 * The spans of a `features` panel, drawn with the mark the alignment overlay
 * draws: an arrow where the feature carries a strand, a box otherwise, labeled
 * where the text fits. The x mapping is the panel's own, resolved in
 * `resolvedRowPanels`; a row needing several lanes divides its height between
 * them.
 */
export function renderFeaturePanel({
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
  panel: ResolvedFeaturePanel
  offsetY: number
  blockSizeYOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { rowHeight, blockSize, highResScaleFactor } = model
  const by = blockSizeYOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(0, rowHeight / 2 - offsetY)

  drawFeatureSpans<RowPanelSpan>({
    ctx,
    ...featurePanelSource(
      model,
      panel,
      getVisibleLeaves({ model, offsetY, blockSizeY: by }),
    ),
    contrastText: contrastTextFn(theme),
    xMin: 0,
    xMax: panel.width,
  })
}

/** a features panel's spans over `leaves`, in panel pixels, a lane apiece */
export function featurePanelSource(
  model: MsaViewModel,
  panel: ResolvedFeaturePanel,
  leaves: HierarchyNode<NodeWithIds>[],
): SpanSource<RowPanelSpan> {
  const { rowHeight } = model
  return {
    rows: spanRows(leaves, panel.spans),
    layout: {
      height: laneCount => Math.max(1, rowHeight / laneCount - rowPadding),
      top: (y, lane, h) =>
        y - rowHeight + lane * (h + rowPadding) + rowPadding / 2,
      headLength: h => h,
    },
    xOf: span => [span.xStart, span.xEnd],
    colors: panel.colors,
    labelOf: span => panel.labels?.get(span.annotation),
  }
}

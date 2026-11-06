import { treeHoverColor } from '../overlayColors.ts'
import { fillRowRuns, inRuns, rowRuns } from '../rowBands.ts'

import type { MsaViewModel } from '../../model.ts'

export function renderTreeMouseover({
  ctx,
  model,
}: {
  ctx: CanvasRenderingContext2D
  model: MsaViewModel
}) {
  const {
    rowHeight,
    effectiveTreeAreaWidth: width,
    msaAreaHeight: height,
    scrollY,
    mouseRow,
    referenceRowIndex,
    hoveredRowIndices,
    highResScaleFactor,
  } = model
  ctx.resetTransform()
  ctx.clearRect(0, 0, width * highResScaleFactor, height * highResScaleFactor)
  ctx.scale(highResScaleFactor, highResScaleFactor)

  const area = {
    ctx,
    rowHeight,
    top: scrollY,
    x: 0,
    width,
    yMin: 0,
    yMax: height,
  }
  const hovered = rowRuns(hoveredRowIndices)
  ctx.fillStyle = treeHoverColor
  fillRowRuns(area, hovered)
  if (
    mouseRow !== undefined &&
    mouseRow !== referenceRowIndex &&
    !inRuns(hovered, mouseRow)
  ) {
    fillRowRuns(area, [[mouseRow, mouseRow]])
  }
}

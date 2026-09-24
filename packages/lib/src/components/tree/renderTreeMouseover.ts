import { treeHoverColor } from '../overlayColors.ts'

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
    treeAreaWidth: width,
    height,
    scrollY,
    mouseRow,
    referenceRowIndex,
    hoveredRowIndices,
  } = model
  ctx.resetTransform()
  ctx.clearRect(0, 0, width, height)

  const rowBand = (index: number) => {
    ctx.fillRect(0, index * rowHeight + scrollY, width, rowHeight)
  }

  ctx.fillStyle = treeHoverColor
  for (const index of hoveredRowIndices) {
    rowBand(index)
  }
  if (
    mouseRow !== undefined &&
    mouseRow !== referenceRowIndex &&
    !hoveredRowIndices.includes(mouseRow)
  ) {
    rowBand(mouseRow)
  }
}

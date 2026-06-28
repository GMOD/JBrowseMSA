import { getVisibleLeaves } from './getVisibleLeaves.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { NodeWithIdsAndLength } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

export function renderBoxFeatureCanvasBlock({
  model,
  offsetX,
  offsetY,
  ctx,
  highResScaleFactorOverride,
  blockSizeYOverride,
}: {
  offsetX: number
  offsetY: number
  model: MsaViewModel
  ctx: RenderCtx
  highResScaleFactorOverride?: number
  blockSizeYOverride?: number
}) {
  const { blockSize, rowHeight, highResScaleFactor, showDomains } = model
  if (showDomains) {
    const k = highResScaleFactorOverride ?? highResScaleFactor
    const by = blockSizeYOverride ?? blockSize
    ctx.resetTransform()
    ctx.scale(k, k)
    ctx.translate(-offsetX, rowHeight / 2 - offsetY)

    const visibleLeaves = getVisibleLeaves({ model, offsetY, blockSizeY: by })

    drawTiles({
      model,
      ctx,
      visibleLeaves,
    })
  }
}

function drawTiles({
  model,
  ctx,
  visibleLeaves,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
}) {
  const {
    subFeatureRows,
    colWidth,
    rowHeight,
    fillPalette,
    strokePalette,
    tidyFilteredGatheredInterProAnnotations,
  } = model

  for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
    const node = visibleLeaves[i]!
    const {
      x,
      data: { name },
    } = node
    const y = x!

    const entry = tidyFilteredGatheredInterProAnnotations[name]

    if (entry) {
      for (let j = 0, l2 = entry.length; j < l2; j++) {
        const { start, end, accession, strand } = entry[j]!
        // Convert sequence positions to visible column positions
        // seqPos is 1-based from InterPro, so subtract 1 for 0-based
        const m1 = model.seqPosToVisibleCol(name, start - 1)
        const m2 = model.seqPosToVisibleCol(name, end)
        if (m1 === undefined || m2 === undefined) {
          continue // Skip if either position is hidden
        }
        const x = m1 * colWidth
        ctx.fillStyle = fillPalette[accession]!
        ctx.strokeStyle = strokePalette[accession]!
        const h = subFeatureRows ? 4 : rowHeight
        const t = y - rowHeight + (subFeatureRows ? j * h : 0)
        const lw = colWidth * (m2 - m1)
        if (strand === undefined) {
          ctx.fillRect(x, t, lw, h)
          ctx.strokeRect(x, t, lw, h)
        } else {
          drawGeneArrow({ ctx, x, t, w: lw, h, strand })
        }
      }
    }
  }
}

// A gene arrow: a full-width rectangular body spanning the feature's
// start..end columns, plus a triangular head that points *beyond* that end in
// the strand direction (right for +, left for -). Keeping the body aligned to
// the exact start/end columns means + and - strand features read as having the
// same boundaries; the arrow lives outside them purely to show transcription
// direction, preserving the column-by-column homology down the rows.
function drawGeneArrow({
  ctx,
  x,
  t,
  w,
  h,
  strand,
}: {
  ctx: RenderCtx
  x: number
  t: number
  w: number
  h: number
  strand: number
}) {
  const head = h
  ctx.beginPath()
  if (strand > 0) {
    ctx.moveTo(x, t)
    ctx.lineTo(x + w, t)
    ctx.lineTo(x + w + head, t + h / 2)
    ctx.lineTo(x + w, t + h)
    ctx.lineTo(x, t + h)
  } else {
    ctx.moveTo(x + w, t)
    ctx.lineTo(x, t)
    ctx.lineTo(x - head, t + h / 2)
    ctx.lineTo(x, t + h)
    ctx.lineTo(x + w, t + h)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

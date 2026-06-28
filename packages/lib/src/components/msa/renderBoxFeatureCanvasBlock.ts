import { getVisibleLeaves } from './getVisibleLeaves.ts'
import { subFeatureRowHeight } from '../../constants.ts'

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
    segmentLabels,
    showMsaLetters,
    tidyFilteredGatheredInterProAnnotations,
  } = model
  const h = subFeatureRows ? subFeatureRowHeight : rowHeight
  // exon numbers label the bands only when residue letters aren't drawn (zoomed
  // out); when letters show, the alternating shades alone mark the boundaries
  // and a number would collide with the sequence
  const drawSegmentLabels = !showMsaLetters && !subFeatureRows && h >= 9

  for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
    const node = visibleLeaves[i]!
    const { name } = node.data
    const y = node.x!
    const entry = tidyFilteredGatheredInterProAnnotations[name]

    if (entry) {
      for (let j = 0, l2 = entry.length; j < l2; j++) {
        const { start, end, accession, strand } = entry[j]!
        // Convert sequence positions to visible column positions
        // seqPos is 1-based from InterPro, so subtract 1 for 0-based
        const m1 = model.seqPosToVisibleCol(name, start - 1)
        const m2 = model.seqPosToVisibleCol(name, end)
        if (m1 !== undefined && m2 !== undefined) {
          const x = m1 * colWidth
          const t = y - rowHeight + (subFeatureRows ? j * h : 0)
          const lw = colWidth * (m2 - m1)
          ctx.fillStyle = fillPalette[accession]!
          ctx.strokeStyle = strokePalette[accession]!
          if (strand === undefined) {
            ctx.fillRect(x, t, lw, h)
            ctx.strokeRect(x, t, lw, h)
            // segment (exon) number drawn once per band, on the top visible row,
            // so it reads as a column header for the whole band
            const label = drawSegmentLabels ? segmentLabels.get(accession) : undefined
            if (label !== undefined && i === 0) {
              const fontSize = Math.min(h - 2, 11)
              ctx.font = `${fontSize}px sans-serif`
              if (ctx.measureText(label).width + 2 <= lw) {
                ctx.fillStyle = '#222'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(label, x + lw / 2, t + h / 2)
              }
            }
          } else {
            drawGeneArrow({ ctx, x, t, w: lw, h, strand })
          }
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
  // body spans bodyStart..bodyEnd (the exact columns); the head extends one
  // row-height past bodyEnd in the strand direction
  const dir = strand > 0 ? 1 : -1
  const bodyStart = strand > 0 ? x : x + w
  const bodyEnd = strand > 0 ? x + w : x
  ctx.beginPath()
  ctx.moveTo(bodyStart, t)
  ctx.lineTo(bodyEnd, t)
  ctx.lineTo(bodyEnd + dir * h, t + h / 2)
  ctx.lineTo(bodyEnd, t + h)
  ctx.lineTo(bodyStart, t + h)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

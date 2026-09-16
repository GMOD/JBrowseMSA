import { domainUnderlineHeight, subFeatureRowHeight } from '../../constants.ts'
import { contrastTextFn } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { NodeWithIdsAndLength } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

export function renderBoxFeatureCanvasBlock({
  model,
  theme,
  offsetX,
  offsetY,
  ctx,
  highResScaleFactorOverride,
  blockSizeXOverride,
  blockSizeYOverride,
}: {
  offsetX: number
  offsetY: number
  model: MsaViewModel
  theme: Theme
  ctx: RenderCtx
  highResScaleFactorOverride?: number
  blockSizeXOverride?: number
  blockSizeYOverride?: number
}) {
  const { blockSize, rowHeight, highResScaleFactor, actuallyShowDomains } =
    model
  if (actuallyShowDomains) {
    const k = highResScaleFactorOverride ?? highResScaleFactor
    const bx = blockSizeXOverride ?? blockSize
    const by = blockSizeYOverride ?? blockSize
    ctx.resetTransform()
    ctx.scale(k, k)
    ctx.translate(-offsetX, rowHeight / 2 - offsetY)

    drawTiles({
      model,
      theme,
      ctx,
      visibleLeaves: getVisibleLeaves({ model, offsetY, blockSizeY: by }),
      offsetX,
      blockWidth: bx,
    })
  }
}

function drawTiles({
  model,
  theme,
  ctx,
  visibleLeaves,
  offsetX,
  blockWidth,
}: {
  model: MsaViewModel
  theme: Theme
  ctx: RenderCtx
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  offsetX: number
  blockWidth: number
}) {
  const {
    subFeatureRows,
    colWidth,
    rowHeight,
    featureColors,
    featureLabels,
    segmentLabels,
    showMsaLetters,
    domainUnderline,
    domainBands,
  } = model
  const contrastText = contrastTextFn(theme)
  // the plain and underline modes give every band the same height; a sub-row
  // band is thinner, and how thin depends on how many lanes its row needs
  const barHeight = domainUnderline
    ? Math.min(domainUnderlineHeight, rowHeight)
    : rowHeight
  // exon numbers label the bands only when residue letters aren't drawn (zoomed
  // out); when letters show, the alternating shades alone mark the boundaries
  // and a number would collide with the sequence. A featureLabel encoding names
  // what every span carries instead
  const drawSegmentLabels =
    !featureLabels && !showMsaLetters && !subFeatureRows && barHeight >= 9
  // gene arrow heads stick out up to a row height past the band, so pad the
  // cull window enough that a band just outside the block still draws its head
  const cull = rowHeight + colWidth
  const xMin = offsetX - cull
  const xMax = offsetX + blockWidth + cull

  // a segment (exon) number labels its band once per block, on the topmost
  // visible row carrying that segment, so it reads as a column header for the
  // whole band. Keyed by accession rather than drawn on row 0, because the rows
  // carrying the gene model are often not the first ones in the alignment
  const labelled = drawSegmentLabels ? new Set<string>() : undefined

  for (const node of visibleLeaves) {
    const y = node.x!
    const bands = domainBands.get(node.data.name)

    if (bands) {
      // sub-rows are thin, but a row whose lanes would spill onto the row below
      // shares out the row height between them instead
      const h = subFeatureRows
        ? Math.min(subFeatureRowHeight, rowHeight / bands[0]!.laneCount)
        : barHeight
      // the head keeps its full size on an underline bar, since a head as short
      // as the bar reads as a nub rather than as a direction
      const headLen = domainUnderline ? rowHeight / 2 : h

      for (const { annotation, startCol, endCol, lane } of bands) {
        const { accession, strand } = annotation
        const x = startCol * colWidth
        const lw = colWidth * (endCol - startCol)
        if (x + lw >= xMin && x <= xMax) {
          const t =
            y -
            rowHeight +
            (subFeatureRows ? lane * h : domainUnderline ? rowHeight - h : 0)
          const { fill, stroke } = featureColors.get(annotation)!
          ctx.fillStyle = fill
          ctx.strokeStyle = stroke
          if (strand === undefined) {
            ctx.fillRect(x, t, lw, h)
            ctx.strokeRect(x, t, lw, h)
          } else {
            drawGeneArrow({ ctx, x, t, w: lw, h, headLen, strand })
          }
          const label =
            featureLabels?.get(annotation) ??
            (labelled && !labelled.has(accession)
              ? segmentLabels.get(accession)
              : undefined)
          if (label !== undefined) {
            const fontSize = Math.min(h - 2, 11)
            ctx.font = `${fontSize}px sans-serif`
            if (ctx.measureText(label).width + 2 <= lw) {
              labelled?.add(accession)
              ctx.fillStyle = contrastText(fill)
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(label, x + lw / 2, t + h / 2)
            }
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
  headLen,
  strand,
}: {
  ctx: RenderCtx
  x: number
  t: number
  w: number
  h: number
  headLen: number
  strand: number
}) {
  // body spans bodyStart..bodyEnd (the exact columns); the head extends
  // headLen past bodyEnd in the strand direction
  const dir = strand > 0 ? 1 : -1
  const bodyStart = strand > 0 ? x : x + w
  const bodyEnd = strand > 0 ? x + w : x
  ctx.beginPath()
  ctx.moveTo(bodyStart, t)
  ctx.lineTo(bodyEnd, t)
  ctx.lineTo(bodyEnd + dir * headLen, t + h / 2)
  ctx.lineTo(bodyEnd, t + h)
  ctx.lineTo(bodyStart, t + h)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

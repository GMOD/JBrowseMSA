import { domainUnderlineHeight, subFeatureRowHeight } from '../../constants.ts'
import { contrastTextFn } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { drawFeatureSpans, spanRows } from './drawFeatureSpans.ts'

import type { MsaViewModel } from '../../model.ts'
import type { DomainBand } from '../../types.ts'
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
  const {
    blockSize,
    rowHeight,
    highResScaleFactor,
    actuallyShowDomains,
    subFeatureRows,
    colWidth,
    featureColors,
    featureLabels,
    segmentLabels,
    showMsaLetters,
    domainUnderline,
    domainBands,
  } = model
  if (!actuallyShowDomains) {
    return
  }
  const k = highResScaleFactorOverride ?? highResScaleFactor
  const bx = blockSizeXOverride ?? blockSize
  const by = blockSizeYOverride ?? blockSize
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, rowHeight / 2 - offsetY)

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
    !featureLabels && !showMsaLetters && !subFeatureRows
  // a segment (exon) number labels its band once per block, on the topmost
  // visible row carrying that segment, so it reads as a column header for the
  // whole band. Keyed by accession rather than drawn on row 0, because the rows
  // carrying the gene model are often not the first ones in the alignment
  const labelled = drawSegmentLabels ? new Set<string>() : undefined
  // gene arrow heads stick out up to a row height past the band, so pad the
  // cull window enough that a band just outside the block still draws its head
  const cull = rowHeight + colWidth

  drawFeatureSpans<DomainBand>({
    ctx,
    rows: spanRows(
      getVisibleLeaves({ model, offsetY, blockSizeY: by }),
      domainBands,
    ),
    layout: {
      // sub-rows are thin, but a row whose lanes would spill onto the row below
      // shares out the row height between them instead
      height: laneCount =>
        subFeatureRows
          ? Math.min(subFeatureRowHeight, rowHeight / laneCount)
          : barHeight,
      top: (y, lane, h) =>
        y -
        rowHeight +
        (subFeatureRows ? lane * h : domainUnderline ? rowHeight - h : 0),
      // the head keeps its full size on an underline bar, since a head as short
      // as the bar reads as a nub rather than as a direction
      headLength: h => (domainUnderline ? rowHeight / 2 : h),
    },
    xOf: band => [band.startCol * colWidth, band.endCol * colWidth],
    colors: featureColors,
    labelOf: band =>
      featureLabels?.get(band.annotation) ??
      (labelled && !labelled.has(band.annotation.accession)
        ? segmentLabels.get(band.annotation.accession)
        : undefined),
    labelDrawn: band => labelled?.add(band.annotation.accession),
    contrastText: contrastTextFn(theme),
    xMin: offsetX - cull,
    xMax: offsetX + bx + cull,
  })
}

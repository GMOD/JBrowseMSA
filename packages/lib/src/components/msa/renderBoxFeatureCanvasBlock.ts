import { domainUnderlineHeight, subFeatureRowHeight } from '../../constants.ts'
import { contrastTextFn } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { drawFeatureSpans, spanRows } from './drawFeatureSpans.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { DomainBand } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { SpanSource } from './drawFeatureSpans.ts'
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
  if (!actuallyShowDomains) {
    return
  }
  const k = highResScaleFactorOverride ?? highResScaleFactor
  const bx = blockSizeXOverride ?? blockSize
  const by = blockSizeYOverride ?? blockSize
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, rowHeight / 2 - offsetY)

  const source = domainOverlaySource(
    model,
    getVisibleLeaves({ model, offsetY, blockSizeY: by }),
  )
  const contrastText = contrastTextFn(theme)
  if (model.cellFill === 'residue' && model.domainUnderline) {
    // over residue colors a bar in a categorical color blends into the cells
    // beside it, so a strip of the page background parts it from them
    const { height } = source.layout
    const halo = theme.palette.background.default
    drawFeatureSpans<DomainBand>({
      ctx,
      ...source,
      layout: { ...source.layout, height: n => height(n) + barHalo },
      colors: new Map(
        [...source.colors.keys()].map(a => [a, { fill: halo, stroke: halo }]),
      ),
      labelOf: undefined,
      labelDrawn: undefined,
      contrastText,
      xMin: offsetX,
      xMax: offsetX + bx,
    })
  }
  drawFeatureSpans<DomainBand>({
    ctx,
    ...source,
    contrastText,
    xMin: offsetX,
    xMax: offsetX + bx,
  })
}

const barHalo = 1.5

/**
 * The domain overlay's spans over `leaves`, in alignment pixels: filled rows,
 * an underline bar, or thin sub-rows, as `domainUnderline` and
 * `subFeatureRows` decide.
 */
export function domainOverlaySource(
  model: MsaViewModel,
  leaves: HierarchyNode[],
): SpanSource<DomainBand> {
  const {
    rowHeight,
    subFeatureRows,
    colWidth,
    featureColors,
    featureLabels,
    segmentLabels,
    showMsaLetters,
    domainUnderline,
    domainBands,
  } = model
  // the plain and underline modes give every band the same height; a sub-row
  // band is thinner, and how thin depends on how many lanes its row needs
  const barHeight = domainUnderline
    ? Math.min(domainUnderlineHeight, rowHeight)
    : rowHeight
  // exon numbers label the bands only when residue letters aren't drawn (zoomed
  // out); when letters show, the alternating shades alone mark the boundaries
  // and a number would collide with the sequence. A featureLabel encoding names
  // what every span carries instead
  const drawSegmentLabels = !featureLabels && !showMsaLetters && !subFeatureRows
  // a segment (exon) number labels its band once per block, on the topmost
  // visible row carrying that segment, so it reads as a column header for the
  // whole band. Keyed by accession rather than drawn on row 0, because the rows
  // carrying the gene model are often not the first ones in the alignment
  const labelled = drawSegmentLabels ? new Set<string>() : undefined

  return {
    rows: spanRows(leaves, domainBands),
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
      headLength: h => (domainUnderline ? rowHeight / 2 : h),
      // a head only as tall as an underline bar tapers over ten pixels of
      // three, which reads as nothing; it takes the lower two fifths of the
      // row instead, leaving the letters above it
      headRise: h => (domainUnderline ? Math.max(0, rowHeight * 0.4 - h) : 0),
    },
    xOf: band => [band.startCol * colWidth, band.endCol * colWidth],
    colors: featureColors,
    labelOf: band =>
      featureLabels?.get(band.annotation) ??
      (labelled && !labelled.has(band.annotation.accession)
        ? segmentLabels.get(band.annotation.accession)
        : undefined),
    labelDrawn: band => labelled?.add(band.annotation.accession),
  }
}

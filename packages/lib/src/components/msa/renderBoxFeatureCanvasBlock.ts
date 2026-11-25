import { markSpanHeight } from '../../alignmentMarks.ts'
import { subFeatureRowHeight } from '../../constants.ts'
import { contrastTextFn } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { drawFeatureSpans, spanRows } from './drawFeatureSpans.ts'

import type { ResolvedMark } from '../../alignmentMarks.ts'
import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { DomainBand } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { SpanSource } from './drawFeatureSpans.ts'
import type { Theme } from '@mui/material'

/**
 * The alignment marks over one block, in `marks` order: each mark's halo where
 * it draws a bar over the residue colors, then its spans.
 */
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

  const leaves = getVisibleLeaves({ model, offsetY, blockSizeY: by })
  const contrastText = contrastTextFn(theme)
  const halo = theme.palette.background.default
  for (const mark of model.resolvedMarks) {
    const { source, bar } = markOverlaySource(model, mark, leaves)
    if (model.cellFill === 'residue' && bar) {
      // over residue colors a bar in a categorical color blends into the
      // cells beside it, so a strip of the page background parts it from them
      const { height } = source.layout
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
}

const barHalo = 1.5

/** whether a mark's spans are as tall as the row at the current zoom */
export function markRowTall(model: MsaViewModel, mark: ResolvedMark) {
  return !markSpanHeight(mark.height, {
    rowHeight: model.rowHeight,
    underline: model.domainUnderline,
  }).bar
}

/**
 * Whether a mark's spans cover the cells they lie on: as tall as the row,
 * outside the sub-row layout
 */
export function markCoversCells(model: MsaViewModel, mark: ResolvedMark) {
  return !model.subFeatureRows && markRowTall(model, mark)
}

/**
 * One alignment mark's spans over `leaves`, in alignment pixels: filled rows,
 * a bar at the foot of the row, or thin sub-rows, as the mark's `height`,
 * `domainUnderline` and `subFeatureRows` decide. `bar` says the spans are
 * shorter than the row.
 */
export function markOverlaySource(
  model: MsaViewModel,
  mark: ResolvedMark,
  leaves: HierarchyNode[],
): { source: SpanSource<DomainBand>; bar: boolean } {
  const {
    rowHeight,
    subFeatureRows,
    colWidth,
    segmentLabels,
    showMsaLetters,
    domainUnderline,
  } = model
  const { bands, colors, labels } = mark
  const span = markSpanHeight(mark.height, {
    rowHeight,
    underline: domainUnderline,
  })
  const bar = !subFeatureRows && span.bar
  // exon numbers label the bands only when residue letters aren't drawn (zoomed
  // out); when letters show, the alternating shades alone mark the boundaries
  // and a number would collide with the sequence. A label channel names what
  // every span carries instead
  const drawSegmentLabels = !labels && !showMsaLetters && !subFeatureRows
  // a segment (exon) number labels its band once per block, on the topmost
  // visible row carrying that segment, so it reads as a column header for the
  // whole band. Keyed by accession rather than drawn on row 0, because the rows
  // carrying the gene model are often not the first ones in the alignment
  const labelled = drawSegmentLabels ? new Set<string>() : undefined

  return {
    bar,
    source: {
      rows: spanRows(leaves, bands),
      layout: {
        // sub-rows are thin, but a row whose lanes would spill onto the row
        // below shares out the row height between them instead
        height: laneCount =>
          subFeatureRows
            ? Math.min(subFeatureRowHeight, rowHeight / laneCount)
            : span.h,
        top: (y, lane, h) =>
          y - rowHeight + (subFeatureRows ? lane * h : bar ? rowHeight - h : 0),
        headLength: h => (bar ? rowHeight / 2 : h),
        // a head only as tall as an underline bar tapers over ten pixels of
        // three, which reads as nothing; it takes the lower two fifths of the
        // row instead, leaving the letters above it
        headRise: h => (bar ? Math.max(0, rowHeight * 0.4 - h) : 0),
      },
      xOf: band => [band.startCol * colWidth, band.endCol * colWidth],
      colors,
      labelOf: band =>
        labels?.get(band.annotation) ??
        (labelled && !labelled.has(band.annotation.accession)
          ? segmentLabels.get(band.annotation.accession)
          : undefined),
      labelDrawn: band => labelled?.add(band.annotation.accession),
    },
  }
}

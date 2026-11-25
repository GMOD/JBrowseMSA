import { zoomFrameMaxLetters } from '../../constants.ts'
import { setFontSize } from '../../setFontSize.ts'
import { adjustColorForContrast, contrastTextFn, nonEmpty } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { cellFillRect } from '../pixelSnap.ts'
import { consensusFill } from './consensusFill.ts'
import { domainBandCursor } from './domainBandCursor.ts'
import {
  markCoversCells,
  renderBoxFeatureCanvasBlock,
} from './renderBoxFeatureCanvasBlock.ts'
import { tileColorFn } from './tileColor.ts'
import { visibleColRange } from './visibleColRange.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { Annotation } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

export function renderMSABlock({
  model,
  offsetX,
  offsetY,
  ctx,
  theme,
  highResScaleFactorOverride,
  blockSizeXOverride,
  blockSizeYOverride,
  rasterTiles,
  domains,
}: {
  offsetX: number
  offsetY: number
  theme: Theme
  model: MsaViewModel
  ctx: RenderCtx
  highResScaleFactorOverride?: number
  blockSizeXOverride?: number
  blockSizeYOverride?: number
  rasterTiles?: boolean
  /**
   * draw the alignment marks too, over the cell colors and under the letters,
   * which is the one order every cell fill reads right in
   */
  domains?: boolean
}) {
  const {
    colWidth,
    blockSize,
    rowHeight,
    fontSize,
    highResScaleFactor,
    cellFill,
  } = model
  const fillsCells = cellFill !== 'none'
  const k = highResScaleFactorOverride ?? highResScaleFactor
  const bx = blockSizeXOverride ?? blockSize
  const by = blockSizeYOverride ?? blockSize
  const setup = () => {
    ctx.resetTransform()
    ctx.scale(k, k)
    ctx.translate(-offsetX, rowHeight / 2 - offsetY)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    setFontSize(ctx, fontSize, !fillsCells)
  }
  setup()

  const { xStart, xEnd } = visibleColRange({
    offsetX,
    blockWidth: bx,
    colWidth,
  })
  const visibleLeaves = getVisibleLeaves({ model, offsetY, blockSizeY: by })
  const { relativeTo, columns } = model
  const referenceSeq = relativeTo
    ? columns.get(relativeTo)?.slice(xStart, xEnd)
    : null

  const cells = {
    model,
    ctx,
    theme,
    xStart,
    xEnd,
    visibleLeaves,
    referenceSeq,
    // when the marks fill the cells the background comes from
    // renderBoxFeatureCanvasBlock, so only the letters are drawn here
    drawTiles: cellFill !== 'domain',
    // ...and when the caller has already laid the raster down, the tiles are
    // there but nothing here has to paint them
    rasterTiles,
    letters:
      model.showMsaLetters &&
      (!model.wheelZooming ||
        (bx * by) / (colWidth * rowHeight) <= zoomFrameMaxLetters),
  }
  if (domains) {
    drawTilesAndText({ ...cells, pass: 'tiles' })
    renderBoxFeatureCanvasBlock({
      model,
      theme,
      ctx,
      offsetX,
      offsetY,
      highResScaleFactorOverride,
      blockSizeXOverride,
      blockSizeYOverride,
    })
    setup()
    drawTilesAndText({ ...cells, pass: 'letters' })
  } else {
    drawTilesAndText({ ...cells, pass: 'both' })
  }
  drawInsertionIndicators({
    model,
    ctx,
    xStart,
    xEnd,
    visibleLeaves,
  })
  ctx.resetTransform()
}

function drawTilesAndText({
  model,
  ctx,
  theme,
  visibleLeaves,
  xStart,
  xEnd,
  referenceSeq,
  drawTiles,
  rasterTiles,
  letters: lettersOn,
  pass,
}: {
  model: MsaViewModel
  theme: Theme
  ctx: RenderCtx
  visibleLeaves: HierarchyNode[]
  xStart: number
  xEnd: number
  referenceSeq: string | null | undefined
  drawTiles: boolean
  rasterTiles?: boolean
  letters: boolean
  pass: 'tiles' | 'letters' | 'both'
}) {
  const { cellFill, columns, colWidth, rowHeight, fontSize, relativeTo } = model
  const { gapConsensus } = model

  const fillsCells = cellFill !== 'none'
  const tiles = drawTiles && fillsCells
  const paintTiles = tiles && !rasterTiles && pass !== 'letters'
  const letters = lettersOn && pass !== 'tiles'
  if (paintTiles || letters) {
    const tileColor = tileColorFn(model)
    const fillCell = cellFillRect(ctx)
    // Domain fills come from a categorical palette with no fixed lightness, and
    // a dynamic scheme colors a cell from its column, so a readable letter color
    // is a question about the cell's own color rather than about its letter.
    const contrastText = contrastTextFn(theme)
    const insertionFill = consensusFill(theme)
    const offsetXAligned = xStart * colWidth
    const halfColWidth = colWidth / 2
    // the context is translated by rowHeight/2, so `y` is the row's bottom
    // edge and the baseline lands fontSize/4 below the row center, where the
    // tree puts its tip labels
    const baselineOffset = rowHeight / 2 - fontSize / 4
    // a letter under a mark as tall as the row sits on that mark's span, the
    // last one drawn where several cover it; a bar or a sub-row leaves the
    // letter on its cell
    const covers =
      letters && model.actuallyShowDomains
        ? model.resolvedMarks.flatMap((mark, k) =>
            markCoversCells(model, mark)
              ? [{ bands: model.markBandsByStart[k]!, colors: mark.colors }]
              : [],
          )
        : []

    for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
      const node = visibleLeaves[i]!
      const { name } = node.data
      const y = node.x!
      const str = columns.get(name)?.slice(xStart, xEnd)
      if (str) {
        const tileY = y - rowHeight
        const textY = y - baselineOffset
        const spanFillAt = coveringFill(
          covers.map(({ bands, colors }) => ({
            bandAt: domainBandCursor(bands.get(name)),
            colors,
          })),
        )

        for (let j = 0, l2 = str.length; j < l2; j++) {
          const col = xStart + j
          const letter = str[j]!
          const x = j * colWidth + offsetXAligned
          const isMatchingReference =
            referenceSeq && name !== relativeTo && letter === referenceSeq[j]
          const isMatchingConsensus =
            !isMatchingReference &&
            name !== relativeTo &&
            gapConsensus?.[col] === letter
          const color = tileColor(col, letter)

          if (paintTiles) {
            ctx.fillStyle = isMatchingReference
              ? theme.palette.action.hover
              : isMatchingConsensus
                ? insertionFill
                : (nonEmpty(color) ?? theme.palette.background.default)
            fillCell(x, tileY, colWidth, rowHeight)
          }

          if (letters) {
            const covering = spanFillAt(col)
            ctx.fillStyle = covering
              ? // on top of a span: contrast against its fill
                contrastText(covering.fill)
              : isMatchingReference || isMatchingConsensus
                ? // the dot sits on the faint reference-match wash, which is
                  // the theme's background with a little of its text color in
                  // it, or on the insertion tint
                  theme.palette.text.primary
                : tiles
                  ? // on top of a colored tile, or on the background where the
                    // scheme gives that cell no color
                    contrastText(color)
                  : fillsCells || !color
                    ? // plain background, uncolored letters
                      theme.palette.text.primary
                    : // letter-color mode: darken/lighten to stay readable
                      adjustColorForContrast(
                        color,
                        theme.palette.background.default,
                      )
            ctx.fillText(
              (isMatchingReference && !isGap(letter)) || isMatchingConsensus
                ? '.'
                : letter,
              x + halfColWidth,
              textY,
            )
          }
        }
      }
    }
  }
}

// the fill of the span drawn last over a column, from one cursor per mark in
// drawing order; columns are visited in increasing order
function coveringFill(
  cursors: {
    bandAt: ReturnType<typeof domainBandCursor>
    colors: Map<Annotation, { fill: string }>
  }[],
) {
  return (col: number) => {
    let covering: { fill: string | undefined } | undefined
    for (let k = cursors.length - 1; k >= 0 && !covering; k--) {
      const { bandAt, colors } = cursors[k]!
      const band = bandAt(col)
      covering = band ? { fill: colors.get(band.annotation)?.fill } : undefined
    }
    return covering
  }
}

function isGap(letter: string) {
  return letter === '-' || letter === '.'
}

function drawInsertionIndicators({
  model,
  ctx,
  visibleLeaves,
  xStart,
  xEnd,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  visibleLeaves: HierarchyNode[]
  xStart: number
  xEnd: number
}) {
  const { cellFill, hideGapsEffective } = model
  if (!hideGapsEffective) {
    return
  }

  ctx.lineWidth = 1
  ctx.strokeStyle = '#f0f'
  drawZigZag({ visibleLeaves, xStart, ctx, model, xEnd, offset: 0 })
  ctx.strokeStyle = cellFill === 'none' ? '#000' : '#fff'
  drawZigZag({ visibleLeaves, xStart, ctx, model, xEnd, offset: -1 })
}

function drawZigZag({
  model,
  ctx,
  visibleLeaves,
  xStart,
  xEnd,
  offset,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  visibleLeaves: HierarchyNode[]
  xStart: number
  xEnd: number
  offset: number
}) {
  const zigSize = 1
  const { colWidth, rowHeight, insertionPositions } = model
  for (const node of visibleLeaves) {
    const { name } = node.data
    const insertions = insertionPositions.get(name)
    if (insertions) {
      const y = node.x!
      for (const { pos } of insertions) {
        if (pos >= xStart && pos < xEnd) {
          const x = pos * colWidth
          const top = y - rowHeight
          const bottom = y
          ctx.beginPath()
          ctx.moveTo(x + offset, top + offset)
          let currentY = top
          let goRight = true
          while (currentY < bottom) {
            const nextY = Math.min(currentY + zigSize * 2, bottom)
            const nextX = goRight ? x + zigSize : x - zigSize
            ctx.lineTo(nextX + offset, nextY + offset)
            currentY = nextY
            goRight = !goRight
          }
          ctx.stroke()
        }
      }
    }
  }
}

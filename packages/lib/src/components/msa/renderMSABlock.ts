import { setFontSize } from '../../setFontSize.ts'
import { adjustColorForContrast } from '../../util.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import { domainBandCursor } from './domainBandCursor.ts'
import { tileColorFn } from './tileColor.ts'
import { visibleColRange } from './visibleColRange.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { NodeWithIdsAndLength } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

export function renderMSABlock({
  model,
  offsetX,
  offsetY,
  contrastScheme,
  ctx,
  theme,
  highResScaleFactorOverride,
  blockSizeXOverride,
  blockSizeYOverride,
  rasterTiles,
}: {
  offsetX: number
  offsetY: number
  theme: Theme
  model: MsaViewModel
  contrastScheme: Record<string, string>
  ctx: RenderCtx
  highResScaleFactorOverride?: number
  blockSizeXOverride?: number
  blockSizeYOverride?: number
  rasterTiles?: boolean
}) {
  const {
    colWidth,
    blockSize,
    rowHeight,
    fontSize,
    highResScaleFactor,
    actuallyShowDomains,
    bgColor,
  } = model
  const k = highResScaleFactorOverride ?? highResScaleFactor
  const bx = blockSizeXOverride ?? blockSize
  const by = blockSizeYOverride ?? blockSize
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, rowHeight / 2 - offsetY)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  setFontSize(ctx, fontSize, !bgColor)

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

  drawTilesAndText({
    model,
    ctx,
    theme,
    contrastScheme,
    xStart,
    xEnd,
    visibleLeaves,
    referenceSeq,
    // when domains are shown the background tiles come from
    // renderBoxFeatureCanvasBlock, so only the letters are drawn here
    drawTiles: !actuallyShowDomains,
    // ...and when the caller has already laid the raster down, the tiles are
    // there but nothing here has to paint them
    rasterTiles,
  })
  drawInsertionIndicators({
    model,
    ctx,
    xStart,
    xEnd,
    visibleLeaves,
  })
  ctx.resetTransform()
}

// Letter color to use over a domain box, keyed by accession. Domain fills come
// from a categorical palette that has no fixed lightness, so ask the theme for a
// readable text color per fill instead of assuming dark-on-light.
function domainLetterColors(model: MsaViewModel, theme: Theme) {
  return new Map(
    Object.entries(model.fillPalette).map(([accession, fill]) => [
      accession,
      theme.palette.getContrastText(fill),
    ]),
  )
}

function drawTilesAndText({
  model,
  ctx,
  theme,
  contrastScheme,
  visibleLeaves,
  xStart,
  xEnd,
  referenceSeq,
  drawTiles,
  rasterTiles,
}: {
  model: MsaViewModel
  theme: Theme
  ctx: RenderCtx
  contrastScheme: Record<string, string>
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
  referenceSeq: string | null | undefined
  drawTiles: boolean
  rasterTiles?: boolean
}) {
  const {
    bgColor,
    columns,
    colWidth,
    rowHeight,
    relativeTo,
    showMsaLetters,
    subFeatureRows,
    domainBandsByStart,
  } = model

  const tiles = drawTiles && bgColor
  const paintTiles = tiles && !rasterTiles
  if (paintTiles || showMsaLetters) {
    // over raster tiles the letters take their color from contrastScheme, so
    // the scheme lookup per cell is pure waste
    const needsColor = paintTiles || !tiles
    const tileColor = tileColorFn(model)
    const offsetXAligned = xStart * colWidth
    const halfColWidth = colWidth / 2
    // note: -rowHeight/4 matches +rowHeight/4 in tree
    const quarterRowHeight = rowHeight / 4
    // with the tiles coming from the domain overlay instead, letters sit either
    // on a domain box or on the plain background; sub-row layout stacks the boxes
    // above the letters, so those rows are all plain background
    const overDomains = !drawTiles && !subFeatureRows
    const domainColors = overDomains
      ? domainLetterColors(model, theme)
      : undefined

    for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
      const node = visibleLeaves[i]!
      const { name } = node.data
      const y = node.x!
      const str = columns.get(name)?.slice(xStart, xEnd)
      if (str) {
        const tileY = y - rowHeight
        const textY = y - quarterRowHeight
        const bandAt = domainBandCursor(
          overDomains ? domainBandsByStart.get(name) : undefined,
        )

        for (let j = 0, l2 = str.length; j < l2; j++) {
          const col = xStart + j
          const letter = str[j]!
          const x = j * colWidth + offsetXAligned
          const isMatchingReference =
            referenceSeq && name !== relativeTo && letter === referenceSeq[j]
          const color = needsColor ? tileColor(col, letter) : undefined

          if (paintTiles) {
            ctx.fillStyle = isMatchingReference
              ? theme.palette.action.hover
              : color || theme.palette.background.default
            ctx.fillRect(x, tileY, colWidth, rowHeight)
          }

          if (showMsaLetters) {
            const covering = bandAt(col)
            ctx.fillStyle = covering
              ? // on top of a domain box: contrast against the box fill
                domainColors!.get(covering.annotation.accession)!
              : tiles
                ? // on top of a colored tile
                  (contrastScheme[letter] ?? 'black')
                : !drawTiles || !color
                  ? // plain background, uncolored letters
                    theme.palette.text.primary
                  : // letter-color mode: darken/lighten to stay readable
                    adjustColorForContrast(
                      color,
                      theme.palette.background.default,
                    )
            ctx.fillText(
              isMatchingReference ? '.' : letter,
              x + halfColWidth,
              textY,
            )
          }
        }
      }
    }
  }
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
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
}) {
  const { bgColor, hideGapsEffective } = model
  if (!hideGapsEffective) {
    return
  }

  ctx.lineWidth = 1
  ctx.strokeStyle = '#f0f'
  drawZigZag({ visibleLeaves, xStart, ctx, model, xEnd, offset: 0 })
  ctx.strokeStyle = !bgColor ? '#000' : '#fff'
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
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
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

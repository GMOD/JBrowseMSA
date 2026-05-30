import { getVisibleLeaves } from './getVisibleLeaves.ts'
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
  // match an optional existing "bold " so re-renders don't accumulate it
  // (an invalid "bold bold 16px" string would be silently ignored by canvas,
  // freezing the font size against zoom changes)
  ctx.font = ctx.font.replace(
    /(?:bold )?\d+px/,
    `${bgColor ? '' : 'bold '}${fontSize}px`,
  )

  const { xStart, xEnd } = visibleColRange({ offsetX, blockWidth: bx, colWidth })
  const visibleLeaves = getVisibleLeaves({ model, offsetY, blockSizeY: by })
  const { relativeTo, columns } = model
  const referenceSeq = relativeTo ? columns[relativeTo]?.slice(xStart, xEnd) : null

  if (!actuallyShowDomains) {
    drawTilesAndText({
      model,
      ctx,
      theme,
      contrastScheme,
      offsetX,
      xStart,
      xEnd,
      visibleLeaves,
      referenceSeq,
    })
  } else {
    drawText({
      model,
      ctx,
      offsetX,
      xStart,
      xEnd,
      visibleLeaves,
      referenceSeq,
    })
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
  offsetX,
  ctx,
  theme,
  contrastScheme,
  visibleLeaves,
  xStart,
  xEnd,
  referenceSeq,
}: {
  model: MsaViewModel
  offsetX: number
  theme: Theme
  ctx: RenderCtx
  contrastScheme: Record<string, string>
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
  referenceSeq: string | null | undefined
}) {
  const {
    bgColor,
    colorSchemeName,
    colorScheme,
    columns,
    colWidth,
    rowHeight,
    relativeTo,
    showMsaLetters,
  } = model

  const isClustalX = colorSchemeName === 'clustalx_protein_dynamic'
  const isPercentIdentity = colorSchemeName === 'percent_identity_dynamic'
  const drawBgTiles = bgColor || isClustalX || isPercentIdentity
  if (!drawBgTiles && !showMsaLetters) {
    return
  }
  const offsetXAligned = offsetX - (offsetX % colWidth)
  const halfColWidth = colWidth / 2
  const quarterRowHeight = rowHeight / 4

  for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
    const node = visibleLeaves[i]!
    const { name } = node.data
    const y = node.x!
    const str = columns[name]?.slice(xStart, xEnd)
    if (!str) {
      continue
    }
    const tileY = y - rowHeight
    const textY = y - quarterRowHeight

    for (let j = 0, l2 = str.length; j < l2; j++) {
      const letter = str[j]!
      const x = j * colWidth + offsetXAligned
      const isMatchingReference =
        referenceSeq && name !== relativeTo && letter === referenceSeq[j]

      let color: string | undefined
      if (isClustalX) {
        color = model.colClustalX[xStart + j]![letter]
      } else if (isPercentIdentity) {
        const consensus = model.colConsensus[xStart + j]!
        color = letter === consensus.letter ? consensus.color : undefined
      } else {
        color = colorScheme[letter]
      }

      if (drawBgTiles) {
        ctx.fillStyle = isMatchingReference
          ? theme.palette.action.hover
          : color || theme.palette.background.default
        ctx.fillRect(x, tileY, colWidth, rowHeight)
      }

      if (showMsaLetters) {
        ctx.fillStyle = bgColor
          ? contrastScheme[letter] || 'black'
          : color || 'black'
        ctx.fillText(isMatchingReference ? '.' : letter, x + halfColWidth, textY)
      }
    }
  }
}

// When domains are shown the background tiles come from renderBoxFeatureCanvasBlock,
// so we only need to draw text here.
function drawText({
  model,
  offsetX,
  ctx,
  visibleLeaves,
  xStart,
  xEnd,
  referenceSeq,
}: {
  offsetX: number
  model: MsaViewModel
  ctx: RenderCtx
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
  referenceSeq: string | null | undefined
}) {
  const { showMsaLetters, columns, colWidth, rowHeight, relativeTo } = model

  if (!showMsaLetters) {
    return
  }
  const offsetXAligned = offsetX - (offsetX % colWidth)
  const halfColWidth = colWidth / 2
  const quarterRowHeight = rowHeight / 4
  // note: -rowHeight/4 matches +rowHeight/4 in tree
  ctx.fillStyle = 'black'

  for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
    const node = visibleLeaves[i]!
    const { name } = node.data
    const y = node.x! - quarterRowHeight
    const str = columns[name]?.slice(xStart, xEnd)
    if (!str) {
      continue
    }
    for (let j = 0, l2 = str.length; j < l2; j++) {
      const letter = str[j]!
      const isMatchingReference =
        referenceSeq && name !== relativeTo && letter === referenceSeq[j]
      ctx.fillText(
        isMatchingReference ? '.' : letter,
        j * colWidth + offsetXAligned + halfColWidth,
        y,
      )
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

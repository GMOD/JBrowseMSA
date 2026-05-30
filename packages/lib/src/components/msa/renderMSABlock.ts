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
    drawTiles({
      model,
      ctx,
      theme,
      offsetX,
      xStart,
      xEnd,
      visibleLeaves,
      referenceSeq,
    })
  }
  drawText({
    model,
    ctx,
    offsetX,
    contrastScheme,
    xStart,
    xEnd,
    visibleLeaves,
    referenceSeq,
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

function drawTiles({
  model,
  offsetX,
  ctx,
  visibleLeaves,
  theme,
  xStart,
  xEnd,
  referenceSeq,
}: {
  model: MsaViewModel
  offsetX: number
  theme: Theme
  ctx: RenderCtx
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
  } = model

  const isClustalX = colorSchemeName === 'clustalx_protein_dynamic'
  const isPercentIdentity = colorSchemeName === 'percent_identity_dynamic'
  const offsetXAligned = offsetX - (offsetX % colWidth)

  for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
    const node = visibleLeaves[i]!
    const {
      data: { name },
    } = node
    const y = node.x!
    const str = columns[name]?.slice(xStart, xEnd)
    if (str) {
      for (let j = 0, l2 = str.length; j < l2; j++) {
        const letter = str[j]!

        // Use a muted background for positions that match reference
        const isMatchingReference =
          referenceSeq && name !== relativeTo && letter === referenceSeq[j]

        let color: string | undefined
        if (isClustalX) {
          color = model.colClustalX[xStart + j]![letter]
        } else if (isPercentIdentity) {
          const consensus = model.colConsensus[xStart + j]!
          color = letter === consensus.letter ? consensus.color : undefined
        } else {
          color = colorScheme[letter.toUpperCase()]
        }
        if (bgColor || isClustalX || isPercentIdentity) {
          // Use a very light background for matching positions in relative mode
          const finalColor = isMatchingReference
            ? theme.palette.action.hover
            : color || theme.palette.background.default
          ctx.fillStyle = finalColor
          ctx.fillRect(
            j * colWidth + offsetXAligned,
            y - rowHeight,
            colWidth,
            rowHeight,
          )
        }
      }
    }
  }
}

function drawText({
  model,
  offsetX,
  contrastScheme,
  ctx,
  visibleLeaves,
  xStart,
  xEnd,
  referenceSeq,
}: {
  offsetX: number
  model: MsaViewModel
  contrastScheme: Record<string, string>
  ctx: RenderCtx
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
  referenceSeq: string | null | undefined
}) {
  const {
    bgColor,
    actuallyShowDomains,
    showMsaLetters,
    colorScheme,
    columns,
    colWidth,
    rowHeight,
    relativeTo,
  } = model

  if (showMsaLetters) {
    const offsetXAligned = offsetX - (offsetX % colWidth)
    const halfColWidth = colWidth / 2
    const quarterRowHeight = rowHeight / 4

    for (let i = 0, l1 = visibleLeaves.length; i < l1; i++) {
      const node = visibleLeaves[i]!
      const {
        data: { name },
      } = node
      const y = node.x! - quarterRowHeight
      const str = columns[name]?.slice(xStart, xEnd)
      if (str) {
        for (let j = 0, l2 = str.length; j < l2; j++) {
          const letter = str[j]!

          // Check if this position matches the reference
          const isMatchingReference =
            referenceSeq && name !== relativeTo && letter === referenceSeq[j]

          // Show dot for matching positions, original letter for differences
          const displayLetter = isMatchingReference ? '.' : letter

          const color = colorScheme[letter.toUpperCase()]
          const contrast = contrastScheme[letter.toUpperCase()] || 'black'

          // note: -rowHeight/4 matches +rowHeight/4 in tree
          ctx.fillStyle = actuallyShowDomains
            ? 'black'
            : bgColor
              ? contrast
              : color || 'black'
          ctx.fillText(
            displayLetter,
            j * colWidth + offsetXAligned + halfColWidth,
            y,
          )
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

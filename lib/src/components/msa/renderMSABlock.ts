import type { MsaViewModel } from '../../model'
import type { NodeWithIdsAndLength } from '../../types'
import type { Theme } from '@mui/material'
import type { HierarchyNode } from 'd3-hierarchy'

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
  ctx: CanvasRenderingContext2D
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
    leaves,
    bgColor,
  } = model
  const k = highResScaleFactorOverride || highResScaleFactor
  const bx = blockSizeXOverride || blockSize
  const by = blockSizeYOverride || blockSize
  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, rowHeight / 2 - offsetY)
  ctx.textAlign = 'center'
  ctx.font = ctx.font.replace(/\d+px/, `${bgColor ? '' : 'bold '}${fontSize}px`)

  const yStart = Math.max(0, Math.floor((offsetY - rowHeight) / rowHeight))
  const yEnd = Math.max(0, Math.ceil((offsetY + by + rowHeight) / rowHeight))
  const xStart = Math.max(0, Math.floor(offsetX / colWidth))
  const xEnd = Math.max(0, Math.ceil((offsetX + bx) / colWidth))
  const visibleLeaves = leaves.slice(yStart, yEnd)

  if (!actuallyShowDomains) {
    drawTiles({
      model,
      ctx,
      theme,
      offsetX,
      xStart,
      xEnd,
      visibleLeaves,
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
}: {
  model: MsaViewModel
  offsetX: number
  theme: Theme
  ctx: CanvasRenderingContext2D
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
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

  // Get reference sequence if relativeTo is set
  const referenceSeq = relativeTo
    ? columns[relativeTo]?.slice(xStart, xEnd)
    : null

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

        const color = isClustalX
          ? model.colClustalX[xStart + j]![letter]
          : isPercentIdentity
            ? (() => {
                const consensus = model.colConsensus[xStart + j]!
                return letter === consensus.letter ? consensus.color : undefined
              })()
            : colorScheme[letter.toUpperCase()]
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
}: {
  offsetX: number
  model: MsaViewModel
  contrastScheme: Record<string, string>
  ctx: CanvasRenderingContext2D
  visibleLeaves: HierarchyNode<NodeWithIdsAndLength>[]
  xStart: number
  xEnd: number
}) {
  const {
    bgColor,
    actuallyShowDomains,
    showMsaLetters,
    colorScheme,
    columns,
    colWidth,
    contrastLettering,
    rowHeight,
    relativeTo,
  } = model

  // Get reference sequence if relativeTo is set
  const referenceSeq = relativeTo
    ? columns[relativeTo]?.slice(xStart, xEnd)
    : null

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
          const contrast = contrastLettering
            ? contrastScheme[letter.toUpperCase()] || 'black'
            : 'black'

          // note: -rowHeight/4 matches +rowHeight/4 in tree
          ctx.fillStyle = actuallyShowDomains
            ? 'black'
            : bgColor
              ? contrast
              : color || 'black'
          ctx.fillText(displayLetter, j * colWidth + offsetXAligned + halfColWidth, y)
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
  ctx: CanvasRenderingContext2D
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
  ctx: CanvasRenderingContext2D
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

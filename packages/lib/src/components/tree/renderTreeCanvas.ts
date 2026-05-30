import { calcDepthToLeaf, descendants, links } from '../../hierarchy.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

export const padding = 600

const extendBounds = 5
const radius = 2.5
const d = radius * 2

// Calculate node x-coordinate for both phylogram (with branch lengths) and cladogram (topology only) modes
// For cladograms: x = (maxDepthToLeaf - nodeDepthToLeaf) / maxDepthToLeaf * maxWidth
// This positions: leaves at maxWidth (rightmost), root at 0 (leftmost), internal nodes proportionally in between
// Matches ape's: xx <- max(xx) - xx (where xx is depth from each node to tips)
function getNodeX(
  node: HierarchyNode,
  showBranchLen: boolean,
  maxBranchLen: number,
  maxDepthToLeaf: number,
): number | undefined {
  if (showBranchLen) {
    return node.len
  }
  const depthToLeaf = calcDepthToLeaf(node)
  return ((maxDepthToLeaf - depthToLeaf) / maxDepthToLeaf) * maxBranchLen
}

interface ClickEntry {
  name: string
  id: string
  branch?: boolean
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface ClickMapIndex {
  clear(): void
  insert(entry: ClickEntry): void
  finish(): void
  search(box: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }): ClickEntry[]
}

export function renderTree({
  offsetY,
  ctx,
  model,
  theme,
  maxBranchLen,
  maxDepthToLeaf,
  blockSizeYOverride,
}: {
  offsetY: number
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  maxBranchLen: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
}) {
  const { hierarchy, showBranchLenEffective: showBranchLen, blockSize } = model
  const by = blockSizeYOverride || blockSize
  ctx.strokeStyle = theme.palette.text.primary
  for (const link of links(hierarchy)) {
    const { source, target } = link
    const sy = source.x!
    const ty = target.x!
    const tx = getNodeX(target, showBranchLen, maxBranchLen, maxDepthToLeaf)
    const sx = getNodeX(source, showBranchLen, maxBranchLen, maxDepthToLeaf)
    if (tx === undefined || sx === undefined) {
      continue
    }

    const y1 = Math.min(sy, ty)
    const y2 = Math.max(sy, ty)
    // 1d line intersection to check if line crosses block at all, this is an
    // optimization that allows us to skip drawing most tree links outside the
    // block
    if (offsetY + by >= y1 && y2 >= offsetY) {
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx, ty)
      ctx.lineTo(tx, ty)
      ctx.stroke()
    }
  }
}

export function renderNodeBubbles({
  ctx,
  clickMap,
  offsetY,
  model,
  maxBranchLen,
  maxDepthToLeaf,
  blockSizeYOverride,
}: {
  ctx: RenderCtx
  clickMap?: ClickMapIndex
  offsetY: number
  model: MsaViewModel
  maxBranchLen: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
}) {
  const {
    hierarchy,
    showBranchLenEffective: showBranchLen,
    collapsed,
    blockSize,
    marginLeft: ml,
  } = model
  const by = blockSizeYOverride || blockSize
  for (const node of descendants(hierarchy)) {
    const x = getNodeX(node, showBranchLen, maxBranchLen, maxDepthToLeaf)
    if (x === undefined) {
      continue
    }
    const { data } = node
    const y = node.x!
    const { id, name } = data
    if (
      node.height >= 1 &&
      y > offsetY - extendBounds &&
      y < offsetY + by + extendBounds
    ) {
      ctx.strokeStyle = 'black'
      ctx.fillStyle = collapsed.includes(id) ? 'black' : 'white'
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      clickMap?.insert({
        minX: x - radius + ml,
        maxX: x - radius + d + ml,
        minY: y - radius,
        maxY: y - radius + d,
        branch: true,
        id,
        name,
      })
    }
  }
}

export function renderTreeLabels({
  theme,
  model,
  offsetY,
  ctx,
  clickMap,
  maxBranchLen,
  maxDepthToLeaf,
  blockSizeYOverride,
}: {
  model: MsaViewModel
  offsetY: number
  ctx: RenderCtx
  clickMap?: ClickMapIndex
  theme: Theme
  maxBranchLen: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
}) {
  const {
    fontSize,
    showBranchLenEffective: showBranchLen,
    treeMetadata,
    blockSize,
    labelsAlignRight,
    drawTree,
    treeAreaWidth,
    treeAreaWidthMinusMargin,
    marginLeft,
    leaves,
    noTree,
  } = model
  const by = blockSizeYOverride || blockSize
  const emHeight = ctx.measureText('M').width
  if (labelsAlignRight) {
    ctx.textAlign = 'right'
    ctx.setLineDash([1, 3])
  } else {
    ctx.textAlign = 'start'
  }
  for (const node of leaves) {
    const {
      data: { name, id },
    } = node
    const y = node.x!

    const displayName = treeMetadata[name]?.genome || name
    if (y > offsetY - extendBounds && y < offsetY + by + extendBounds) {
      // note: +rowHeight/4 matches with -rowHeight/4 in msa
      const yp = y + fontSize / 4
      let xp = 0
      if (!noTree) {
        xp = getNodeX(node, showBranchLen, maxBranchLen, maxDepthToLeaf) || 0
      }

      const { width } = ctx.measureText(displayName)

      ctx.fillStyle = theme.palette.text.primary
      if (labelsAlignRight) {
        const smallPadding = 2
        const offset = treeAreaWidthMinusMargin - smallPadding
        if (drawTree && !noTree) {
          ctx.moveTo(xp + radius + 2, y)
          ctx.lineTo(offset - smallPadding - width, y)
          ctx.stroke()
        }
        ctx.fillText(displayName, offset, yp)
        clickMap?.insert({
          minX: treeAreaWidth - width,
          maxX: treeAreaWidth,
          minY: yp - emHeight,
          maxY: yp,
          name,
          id,
        })
      } else {
        const labelX = noTree ? 2 : xp + d
        ctx.fillText(displayName, labelX, yp)
        clickMap?.insert({
          minX: labelX + marginLeft,
          maxX: labelX + width + marginLeft,
          minY: yp - emHeight,
          maxY: yp,
          name,
          id,
        })
      }
    }
  }
  ctx.setLineDash([])
}

export function renderTreeCanvas({
  model,
  clickMap,
  ctx,
  offsetY,
  theme,
  highResScaleFactorOverride,
  blockSizeYOverride,
}: {
  model: MsaViewModel
  offsetY: number
  ctx: RenderCtx
  clickMap?: ClickMapIndex
  theme: Theme
  highResScaleFactorOverride?: number
  blockSizeYOverride?: number
}) {
  clickMap?.clear()

  // Defer the finish call until after all inserts are done
  const {
    noTree,
    drawTree,
    drawNodeBubbles,
    highResScaleFactor,
    fontSize,
    showTreeText,
    marginLeft,
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    rowHeight: _rowHeight, // read so the draw autorun re-fires after a zoom change
  } = model

  ctx.resetTransform()

  const k = highResScaleFactorOverride ?? highResScaleFactor
  ctx.scale(k, k)
  ctx.translate(marginLeft, -offsetY)

  const font = ctx.font
  ctx.font = font.replace(/\d+px/, `${fontSize}px`)

  // memoized on the model and shared across the tree/bubble/label passes (and
  // across all tree blocks) rather than re-traversing the hierarchy in each
  const { maxBranchLength: maxBranchLen, maxDepthToLeaf } = model

  if (!noTree && drawTree) {
    renderTree({
      ctx,
      offsetY,
      model,
      theme,
      maxBranchLen,
      maxDepthToLeaf,
      blockSizeYOverride,
    })

    if (drawNodeBubbles) {
      renderNodeBubbles({
        ctx,
        offsetY,
        clickMap,
        model,
        maxBranchLen,
        maxDepthToLeaf,
        blockSizeYOverride,
      })
    }
  }

  if (showTreeText) {
    renderTreeLabels({
      ctx,
      offsetY,
      model,
      clickMap,
      theme,
      maxBranchLen,
      maxDepthToLeaf,
      blockSizeYOverride,
    })
  }

  // Finish the index so it's ready for queries
  clickMap?.finish()
}

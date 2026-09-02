import {
  calcDepthToLeaf,
  forEachDescendant,
  forEachLink,
} from '../../hierarchy.ts'
import { setFontSize } from '../../setFontSize.ts'
import { getVisibleLeaves } from '../getVisibleLeaves.ts'
import {
  drawHighlightLabel,
  highlightRowFill,
} from '../msa/renderHighlights.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { ClickMapIndex } from './clickMap.ts'
import type { Theme } from '@mui/material'

export const padding = 600

const extendBounds = 5
const radius = 2.5
const d = radius * 2

// whether a node's row-center y falls within the block being drawn, padded by
// extendBounds so bubbles/labels/triangles straddling the edge still render
function inYBlock(y: number, offsetY: number, by: number) {
  return y > offsetY - extendBounds && y < offsetY + by + extendBounds
}

// Calculate node x-coordinate for both phylogram (with branch lengths) and
// cladogram (topology only) modes. tipX is the pixel x the tips sit at.
// For cladograms: x = (maxDepthToLeaf - nodeDepthToLeaf) / maxDepthToLeaf * tipX
// This positions: leaves at tipX (rightmost), root at 0 (leftmost), internal nodes proportionally in between
// Matches ape's: xx <- max(xx) - xx (where xx is depth from each node to tips)
export function getNodeX(
  node: HierarchyNode,
  showBranchLen: boolean,
  tipX: number,
  maxDepthToLeaf: number,
): number | undefined {
  if (showBranchLen) {
    return node.len
  }
  if (maxDepthToLeaf === 0) {
    return 0
  }
  const depthToLeaf = calcDepthToLeaf(node)
  return ((maxDepthToLeaf - depthToLeaf) / maxDepthToLeaf) * tipX
}

function renderTree({
  offsetY,
  ctx,
  model,
  theme,
  tipX,
  maxDepthToLeaf,
  blockSizeYOverride,
}: {
  offsetY: number
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  tipX: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
}) {
  const { hierarchy, showBranchLenEffective: showBranchLen, blockSize } = model
  const by = blockSizeYOverride ?? blockSize
  ctx.strokeStyle = theme.palette.text.primary
  forEachLink(hierarchy, (source, target) => {
    const sy = source.x!
    const ty = target.x!
    const tx = getNodeX(target, showBranchLen, tipX, maxDepthToLeaf)
    const sx = getNodeX(source, showBranchLen, tipX, maxDepthToLeaf)
    if (tx === undefined || sx === undefined) {
      return
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
  })
}

function renderCollapsedTriangles({
  ctx,
  clickMap,
  offsetY,
  model,
  theme,
  tipX,
  maxDepthToLeaf,
  blockSizeYOverride,
  collapsedSet,
}: {
  ctx: RenderCtx
  clickMap?: ClickMapIndex
  offsetY: number
  model: MsaViewModel
  theme: Theme
  tipX: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
  collapsedSet: Set<string>
}) {
  const {
    hierarchy,
    showBranchLenEffective: showBranchLen,
    blockSize,
    rowHeight,
    fontSize,
    marginLeft: ml,
  } = model
  // nothing collapsed is the common case, and the traversal below visits every
  // node in the tree on every block of every redraw
  if (collapsedSet.size === 0) {
    return
  }
  const by = blockSizeYOverride ?? blockSize
  const halfHeight = Math.max(2, rowHeight * 0.42)
  forEachDescendant(hierarchy, node => {
    const { id, name } = node.data
    if (collapsedSet.has(id)) {
      const apexX = getNodeX(node, showBranchLen, tipX, maxDepthToLeaf)
      const y = node.x!
      const inBlock = inYBlock(y, offsetY, by)
      // in cladogram mode the hidden tips align at the right edge, otherwise use
      // the branch-length extent recorded in the model's hierarchy getter
      const baseX = showBranchLen ? (node.collapsedTipXFar ?? tipX) : tipX
      if (apexX !== undefined && inBlock && baseX > apexX) {
        ctx.beginPath()
        ctx.moveTo(apexX, y)
        ctx.lineTo(baseX, y - halfHeight)
        ctx.lineTo(baseX, y + halfHeight)
        ctx.closePath()
        ctx.fillStyle = theme.palette.action.disabled
        ctx.fill()
        ctx.strokeStyle = theme.palette.text.primary
        ctx.stroke()

        // node.value carries the leaf count from the pre-collapse sum() pass
        const count = node.value
        if (count !== undefined && rowHeight >= 8) {
          ctx.fillStyle = theme.palette.text.primary
          ctx.textAlign = 'left'
          ctx.fillText(`${count}`, baseX + 3, y + fontSize / 4)
        }

        // the whole triangle is a click/hover target that opens the
        // branch menu (Expand this node); the apex bubble's own click entry is
        // skipped for collapsed nodes so this descriptive label wins
        const label = name === id ? 'Collapsed clade' : name
        clickMap?.insert({
          minX: apexX + ml,
          maxX: baseX + ml,
          minY: y - halfHeight,
          maxY: y + halfHeight,
          branch: true,
          id,
          name: count === undefined ? label : `${label} (${count} tips)`,
        })
      }
    }
  })
}

// the bubbles are click targets whether or not they are painted, so this pass
// always runs and `draw` only decides whether it also strokes the circles
function renderNodeBubbles({
  ctx,
  clickMap,
  offsetY,
  model,
  tipX,
  maxDepthToLeaf,
  blockSizeYOverride,
  collapsedSet,
  draw,
}: {
  ctx: RenderCtx
  clickMap?: ClickMapIndex
  offsetY: number
  model: MsaViewModel
  tipX: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
  collapsedSet: Set<string>
  draw: boolean
}) {
  const {
    hierarchy,
    showBranchLenEffective: showBranchLen,
    blockSize,
    marginLeft: ml,
  } = model
  const by = blockSizeYOverride ?? blockSize
  forEachDescendant(hierarchy, node => {
    const x = getNodeX(node, showBranchLen, tipX, maxDepthToLeaf)
    if (x === undefined) {
      return
    }
    const { data } = node
    const y = node.x!
    const { id, name } = data
    if (node.height >= 1 && inYBlock(y, offsetY, by)) {
      const isCollapsed = collapsedSet.has(id)
      if (draw) {
        ctx.strokeStyle = 'black'
        ctx.fillStyle = isCollapsed ? 'black' : 'white'
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      }

      // collapsed nodes get their click/hover target from the triangle pass,
      // which covers the apex bubble and carries a descriptive label
      if (!isCollapsed) {
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
  })
}

function renderTreeLabels({
  theme,
  model,
  offsetY,
  ctx,
  clickMap,
  tipX,
  maxDepthToLeaf,
  blockSizeYOverride,
  collapsedSet,
}: {
  model: MsaViewModel
  offsetY: number
  ctx: RenderCtx
  clickMap?: ClickMapIndex
  theme: Theme
  tipX: number
  maxDepthToLeaf: number
  blockSizeYOverride?: number
  collapsedSet: Set<string>
}) {
  const {
    fontSize,
    showBranchLenEffective: showBranchLen,
    treeMetadata,
    blockSize,
    labelsAlignRight,
    drawTree,
    treeAreaWidthMinusMargin,
    marginLeft,
    noTree,
    labelWidthMap,
    labelWidthScale,
  } = model
  const by = blockSizeYOverride ?? blockSize
  // labels only exist for leaves, which are laid out top to bottom, so take the
  // same slice the MSA renderer uses instead of walking every tip per block
  const visibleLeaves = getVisibleLeaves({ model, offsetY, blockSizeY: by })
  const emHeight = ctx.measureText('M').width
  if (labelsAlignRight) {
    ctx.textAlign = 'right'
    ctx.setLineDash([1, 3])
    ctx.strokeStyle = theme.palette.text.primary
  } else {
    ctx.textAlign = 'start'
  }
  for (const node of visibleLeaves) {
    const {
      data: { name, id },
    } = node
    const y = node.x!

    const displayName = treeMetadata[name]?.genome || name
    // a collapsed clade is drawn as a triangle + tip count; suppress its leaf
    // label when the "name" is just the auto-generated internal-node id
    const isAnonymousCollapsed = collapsedSet.has(id) && name === id
    if (!isAnonymousCollapsed && inYBlock(y, offsetY, by)) {
      // note: +rowHeight/4 matches with -rowHeight/4 in msa
      const yp = y + fontSize / 4
      let xp = 0
      if (!noTree) {
        xp = getNodeX(node, showBranchLen, tipX, maxDepthToLeaf) ?? 0
      }

      const measured = labelWidthMap.get(name)
      const width =
        measured === undefined
          ? ctx.measureText(displayName).width
          : measured * labelWidthScale

      ctx.fillStyle = theme.palette.text.primary
      if (labelsAlignRight) {
        const smallPadding = 2
        const offset = treeAreaWidthMinusMargin - smallPadding
        if (drawTree && !noTree) {
          // beginPath is load-bearing: without it every leader line re-strokes
          // all the ones before it, which is quadratic in the label count
          ctx.beginPath()
          ctx.moveTo(xp + radius + 2, y)
          ctx.lineTo(offset - smallPadding - width, y)
          ctx.stroke()
        }
        ctx.fillText(displayName, offset, yp)
        // everything here is drawn under translate(marginLeft), so the click box
        // has to be the text's own right edge in that same space -- taking
        // treeAreaWidth instead put the target smallPadding off the label
        const labelRight = offset + marginLeft
        clickMap?.insert({
          minX: labelRight - width,
          maxX: labelRight,
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

// the row sets of `highlights`, tinted across the tree area under the labels
// with the label in the gutter at the first row of each set
function renderRowHighlights({
  ctx,
  model,
  theme,
  offsetY,
  blockSizeYOverride,
}: {
  ctx: RenderCtx
  model: MsaViewModel
  theme: Theme
  offsetY: number
  blockSizeYOverride?: number
}) {
  const {
    resolvedHighlights,
    rowHeight,
    treeAreaWidth,
    marginLeft,
    blockSize,
  } = model
  const by = blockSizeYOverride ?? blockSize
  for (const { rowIndices, label, color } of resolvedHighlights) {
    ctx.fillStyle = color ?? highlightRowFill
    for (const index of rowIndices) {
      const y = index * rowHeight
      if (inYBlock(y + rowHeight / 2, offsetY, by)) {
        ctx.fillRect(-marginLeft, y, treeAreaWidth, rowHeight)
      }
    }
    const first = Math.min(...rowIndices)
    if (
      label &&
      rowIndices.length &&
      inYBlock(first * rowHeight, offsetY, by)
    ) {
      drawHighlightLabel({
        ctx,
        theme,
        label,
        x: -marginLeft + 2,
        y: first * rowHeight,
        spanWidth: treeAreaWidth,
      })
    }
  }
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

  setFontSize(ctx, fontSize)

  // memoized on the model and shared across the tree/bubble/label passes (and
  // across all tree blocks) rather than re-traversing the hierarchy in each
  const { maxBranchLength, maxDepthToLeaf, showBranchLenEffective, treeWidth } =
    model
  // pixel x of the tips. A phylogram scales branch lengths so the longest
  // root-to-tip path lands at maxBranchLength; a cladogram ignores lengths and
  // spreads topological depth across the whole tree area instead. Reusing
  // maxBranchLength for the cladogram would pin every node to x=0 for a tree
  // with no branch lengths -- which is exactly what forces cladogram mode.
  const tipX = showBranchLenEffective ? maxBranchLength : treeWidth
  // built once for all three passes: each of them asks about a different node on
  // every block of every redraw, and `collapsed` is a list
  const collapsedSet = new Set(model.collapsed)

  renderRowHighlights({ ctx, model, theme, offsetY, blockSizeYOverride })
  setFontSize(ctx, fontSize)

  if (!noTree && drawTree) {
    renderTree({
      ctx,
      offsetY,
      model,
      theme,
      tipX,
      maxDepthToLeaf,
      blockSizeYOverride,
    })

    renderCollapsedTriangles({
      ctx,
      clickMap,
      offsetY,
      model,
      theme,
      tipX,
      maxDepthToLeaf,
      blockSizeYOverride,
      collapsedSet,
    })

    renderNodeBubbles({
      ctx,
      offsetY,
      clickMap,
      model,
      tipX,
      maxDepthToLeaf,
      blockSizeYOverride,
      collapsedSet,
      draw: drawNodeBubbles,
    })
  }

  if (showTreeText) {
    renderTreeLabels({
      ctx,
      offsetY,
      model,
      clickMap,
      theme,
      tipX,
      maxDepthToLeaf,
      blockSizeYOverride,
      collapsedSet,
    })
  }

  // Finish the index so it's ready for queries
  clickMap?.finish()
}

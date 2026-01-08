import type { MsaViewModel } from '../../model'
import type { Theme } from '@mui/material'

export const padding = 600

const extendBounds = 5
const radius = 2.5
const d = radius * 2

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
  blockSizeYOverride,
}: {
  offsetY: number
  ctx: CanvasRenderingContext2D
  model: MsaViewModel
  theme: Theme
  blockSizeYOverride?: number
}) {
  const {
    hierarchy,
    allBranchesLength0,
    showBranchLen: showBranchLenPre,
    blockSize,
  } = model
  const by = blockSizeYOverride || blockSize
  ctx.strokeStyle = theme.palette.text.primary
  const showBranchLen = allBranchesLength0 ? false : showBranchLenPre
  for (const link of hierarchy.links()) {
    const { source, target } = link
    if (target.height === 0 && !showBranchLen) {
      continue
    }
    const sy = source.x!
    const ty = target.x!
    // @ts-expect-error
    const tx = showBranchLen ? target.len : target.y
    // @ts-expect-error
    const sx = showBranchLen ? source.len : source.y

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
  blockSizeYOverride,
}: {
  ctx: CanvasRenderingContext2D
  clickMap?: ClickMapIndex
  offsetY: number
  model: MsaViewModel
  theme: Theme
  blockSizeYOverride?: number
}) {
  const {
    hierarchy,
    showBranchLen: showBranchLenPre,
    allBranchesLength0,
    collapsed,
    blockSize,
    marginLeft: ml,
  } = model
  const by = blockSizeYOverride || blockSize
  const showBranchLen = allBranchesLength0 ? false : showBranchLenPre
  for (const node of hierarchy.descendants()) {
    const val = showBranchLen ? 'len' : 'y'
    // @ts-expect-error
    const { [val]: x, data } = node
    const y = node.x!
    const { id, name } = data
    if (
      node.height > 1 &&
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
  blockSizeYOverride,
}: {
  model: MsaViewModel
  offsetY: number
  ctx: CanvasRenderingContext2D
  clickMap?: ClickMapIndex
  theme: Theme
  blockSizeYOverride?: number
}) {
  const {
    fontSize,
    showBranchLen: showBranchLenPre,
    allBranchesLength0,
    treeMetadata,
    hierarchy,
    collapsed,
    collapsedLeaves,
    blockSize,
    labelsAlignRight,
    drawTree,
    treeAreaWidth,
    treeWidth,
    treeAreaWidthMinusMargin,
    marginLeft,
    leaves,
    noTree,
  } = model
  const by = blockSizeYOverride || blockSize
  if (labelsAlignRight) {
    ctx.textAlign = 'right'
    ctx.setLineDash([1, 3])
  } else {
    ctx.textAlign = 'start'
  }
  const showBranchLen = allBranchesLength0 ? false : showBranchLenPre
  for (const node of leaves) {
    const {
      data: { name, id },
      // @ts-expect-error
      len,
    } = node
    const y = node.x!
    const x = node.y!

    const displayName = treeMetadata[name]?.genome || name
    if (y > offsetY - extendBounds && y < offsetY + by + extendBounds) {
      // note: +rowHeight/4 matches with -rowHeight/4 in msa
      const yp = y + fontSize / 4
      let xp = (showBranchLen ? len : x) || 0
      if (
        !showBranchLen &&
        !collapsed.includes(id) &&
        !collapsedLeaves.includes(id)
      ) {
        // this subtraction is a hack to compensate for the leafnode rendering
        // glitch (issue #71). the context is that an extra leaf node is added
        // so that 'collapsing/hiding leaf nodes is possible' but this causes
        // weird workarounds
        xp -= treeWidth / hierarchy.height
      }

      const { width } = ctx.measureText(displayName)
      const height = ctx.measureText('M').width // use an 'em' for height

      ctx.fillStyle = theme.palette.text.primary
      if (labelsAlignRight) {
        const smallPadding = 2
        const offset = treeAreaWidthMinusMargin - smallPadding
        if (drawTree && !noTree) {
          const { width } = ctx.measureText(displayName)
          ctx.moveTo(xp + radius + 2, y)
          ctx.lineTo(offset - smallPadding - width, y)
          ctx.stroke()
        }
        ctx.fillText(displayName, offset, yp)
        clickMap?.insert({
          minX: treeAreaWidth - width,
          maxX: treeAreaWidth,
          minY: yp - height,
          maxY: yp,
          name,
          id,
        })
      } else {
        ctx.fillText(displayName, xp + d, yp)
        clickMap?.insert({
          minX: xp + d + marginLeft,
          maxX: xp + d + width + marginLeft,
          minY: yp - height,
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
  ctx: CanvasRenderingContext2D
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
    nref,
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    rowHeight: _rowHeight, // this is needed for redrawing after zoom change
  } = model

  ctx.resetTransform()

  // this is a bogus use of nref, it is never less than 0. we just are using
  // it in this statement because otherwise it would be an unused variable,
  // we just need to use nref to indicate a redraw in an autorun when canvas
  // ref is updated and in order to convince bundlers like not to delete
  // unused usage with propertyReadSideEffects
  const k =
    nref < 0
      ? Number.NEGATIVE_INFINITY
      : highResScaleFactorOverride || highResScaleFactor
  ctx.scale(k, k)
  ctx.translate(marginLeft, -offsetY)

  const font = ctx.font
  ctx.font = font.replace(/\d+px/, `${fontSize}px`)

  if (!noTree && drawTree) {
    renderTree({
      ctx,
      offsetY,
      model,
      theme,
      blockSizeYOverride,
    })

    if (drawNodeBubbles) {
      renderNodeBubbles({
        ctx,
        offsetY,
        clickMap,
        model,
        theme,
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
      blockSizeYOverride,
    })
  }

  // Finish the index so it's ready for queries
  clickMap?.finish()
}

import { descendants } from '../../hierarchy.ts'
import { getNodeX } from './renderTreeCanvas.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type { RasterCanvas } from '../msa/msaRaster.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

// the tree draws this far inside the band, so a box around the first or the
// last row keeps both of its edges
const pad = 1

interface OverviewArgs {
  model: MsaViewModel
  ctx: RenderCtx
  theme: Theme
  width: number
  height: number
}

function rowScale(numTips: number, height: number) {
  const inner = height - pad * 2
  return (row: number) => pad + (row / numTips) * inner
}

/**
 * The whole tree at the size of the overview band, with the clade highlights
 * under it.
 *
 * A branch that moves less than a pixel on both axes is dropped. The 230k-tip
 * COVID tree has 460k of them over a 120px band, and the ones landing on the
 * pixel their parent already covers cost a path segment each and change no
 * pixel; the test in renderTreeOverview.test.ts measures a 200k-tip tree.
 */
export function drawTreeOverview({
  model,
  ctx,
  theme,
  width,
  height,
}: OverviewArgs) {
  const layout = model.treeOverviewLayout
  if (!layout) {
    return
  }
  const { root, numTips, maxDepthToLeaf, showBranchLen } = layout
  const innerWidth = width - pad * 2
  const rowY = rowScale(numTips, height)
  const nodeX = (node: HierarchyNode) =>
    pad + (getNodeX(node, showBranchLen, 1, maxDepthToLeaf) ?? 0) * innerWidth

  for (const { rows, color } of model.treeOverviewClades) {
    ctx.fillStyle = color
    ctx.fillRect(0, rowY(rows[0]), width, rowY(rows[1] + 1) - rowY(rows[0]))
  }

  ctx.strokeStyle = theme.palette.text.primary
  ctx.beginPath()
  for (const source of descendants(root)) {
    if (!source.children) {
      continue
    }
    const sx = nodeX(source)
    const sy = rowY(source.x!)
    for (const target of source.children) {
      const tx = nodeX(target)
      const ty = rowY(target.x!)
      if (Math.abs(tx - sx) < 1 && Math.abs(ty - sy) < 1) {
        continue
      }
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx, ty)
      ctx.lineTo(tx, ty)
    }
  }
  ctx.stroke()
}

/**
 * A box across the overview around a run of tip rows: the focused subtree's
 * extent, or the one a hovered pixel would focus.
 */
export function drawTreeOverviewBox({
  model,
  ctx,
  color,
  rows,
  width,
  height,
}: Omit<OverviewArgs, 'theme'> & {
  color: string
  rows: [number, number]
}) {
  const layout = model.treeOverviewLayout
  if (!layout) {
    return
  }
  const rowY = rowScale(layout.numTips, height)
  const top = rowY(rows[0])
  ctx.strokeStyle = color
  ctx.strokeRect(0.5, top, width - 1, Math.max(2, rowY(rows[1] + 1) - top))
}

/**
 * The overview as the figure carries it: the tree, the clade highlights and
 * the focus box. The SVG export draws it straight onto a svgcanvas Context,
 * and the live canvas blits `treeOverviewImage` in place of the first two.
 */
export function renderTreeOverview(args: OverviewArgs) {
  drawTreeOverview(args)
  const rows = args.model.treeOverviewFocusRows
  if (rows) {
    drawTreeOverviewBox({
      ...args,
      rows,
      color: args.theme.palette.text.primary,
    })
  }
}

interface OverviewCache {
  keys: unknown[]
  canvas: RasterCanvas | undefined
}

const caches = new WeakMap<object, OverviewCache>()

/**
 * Everything the drawn tree depends on. `treeOverviewLayout` and
 * `treeOverviewClades` are computed views, which recompute on every read
 * outside a reaction, so the key holds the values behind them instead.
 */
function overviewKeys({
  model,
  theme,
  width,
  height,
  scale,
}: {
  model: MsaViewModel
  theme: Theme
  width: number
  height: number
  scale: number
}) {
  return [
    model.data.tree,
    model.data.msa,
    model.currentAlignment,
    model.collapsed.join(','),
    JSON.stringify(model.clades),
    model.showBranchLen,
    width,
    height,
    scale,
    theme.palette.text.primary,
  ]
}

function makeCanvas(width: number, height: number) {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : typeof document !== 'undefined'
        ? Object.assign(document.createElement('canvas'), { width, height })
        : undefined
  const ctx = canvas?.getContext('2d')
  return ctx && typeof (ctx as CanvasRenderingContext2D).stroke === 'function'
    ? { canvas: canvas as RasterCanvas, ctx: ctx as CanvasRenderingContext2D }
    : undefined
}

/**
 * The tree and its clade highlights on an offscreen canvas, drawn once per
 * change of anything they depend on and blitted every frame after that. A
 * 230k-branch tree takes hundreds of milliseconds to walk and cannot be redrawn
 * as the focus box follows the pointer.
 *
 * Returns undefined where a canvas has no 2d context (jsdom), and the caller
 * then draws the tree itself.
 */
export function treeOverviewImage({
  model,
  theme,
  width,
  height,
  scale,
}: {
  model: MsaViewModel
  theme: Theme
  width: number
  height: number
  scale: number
}) {
  const keys = overviewKeys({ model, theme, width, height, scale })
  const prev = caches.get(model)
  if (prev && keys.every((key, i) => key === prev.keys[i])) {
    return prev.canvas
  }
  const made = makeCanvas(
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  )
  if (made) {
    made.ctx.scale(scale, scale)
    drawTreeOverview({ model, ctx: made.ctx, theme, width, height })
  }
  const next = { keys, canvas: made?.canvas }
  caches.set(model, next)
  return next.canvas
}

import { tileColorFn, tileColorTable } from './tileColor.ts'

import type { MsaViewModel } from '../../model.ts'
import type { Theme } from '@mui/material'

// One raster tile holds this many cells on a side. A tile costs ~10ms to build
// and ~1MB to hold, and is then drawn at any zoom for ~1ms, so the cache only
// has to be large enough to cover a screen without thrashing.
export const rasterTileSize = 512
const maxCachedTiles = 64
const maxThumbnailColumns = 2000
const maxColorCacheEntries = 4096

export type RasterCanvas = HTMLCanvasElement | OffscreenCanvas
type RasterCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export interface RasterSpec {
  rowNames: string[]
  columns: Map<string, string>
  relativeTo: string | undefined
  colorAt: (col: number, letter: string) => string | undefined
  bg: string
  hover: string
}

const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1

function packRgba(r: number, g: number, b: number, a: number) {
  return littleEndian
    ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
    : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
}

let scratch: RasterCtx | null | undefined
const colorCache = new Map<string, number>()

/**
 * CSS color string -> the packed pixel an ImageData holds for it. Painting a 1x1
 * canvas and reading it back handles every form a color scheme can produce --
 * hex, rgb(), hsl(), named -- without a parser of our own, and the cache means
 * each distinct color is resolved once per session rather than once per cell.
 */
export function cssColorToPixel(css: string) {
  const hit = colorCache.get(css)
  if (hit !== undefined) {
    return hit
  }
  if (scratch === undefined) {
    scratch = makeRasterCanvas(1, 1)?.ctx ?? null
  }
  let packed = 0
  if (scratch) {
    scratch.clearRect(0, 0, 1, 1)
    scratch.fillStyle = css
    scratch.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0, a = 0] = scratch.getImageData(0, 0, 1, 1).data
    packed = packRgba(r, g, b, a)
  }
  if (colorCache.size >= maxColorCacheEntries) {
    colorCache.clear()
  }
  colorCache.set(css, packed)
  return packed
}

/**
 * Packs a rectangle of the alignment into one pixel per cell, in `rowNames`
 * order, ready to hand to putImageData. Cells past the end of a row, and rows
 * with no sequence at all, stay transparent -- what the per-cell tile painter
 * also leaves behind.
 *
 * `colStep`/`rowStep` sample instead of covering, which is how the minimap fits
 * a whole alignment into a 12px bar.
 */
export function rasterPixels({
  spec,
  col0,
  row0,
  width,
  height,
  colStep = 1,
  rowStep = 1,
  toPixel = cssColorToPixel,
}: {
  spec: RasterSpec
  col0: number
  row0: number
  width: number
  height: number
  colStep?: number
  rowStep?: number
  toPixel?: (css: string) => number
}) {
  const { rowNames, columns, relativeTo, colorAt, bg, hover } = spec
  const out = new Uint32Array(width * height)
  const bgPixel = toPixel(bg)
  const hoverPixel = toPixel(hover)
  const reference = relativeTo ? columns.get(relativeTo) : undefined

  for (let r = 0; r < height; r++) {
    const name = rowNames[row0 + r * rowStep]
    if (name === undefined) {
      break
    }
    const str = columns.get(name)
    if (!str) {
      continue
    }
    const isReference = name === relativeTo
    const base = r * width
    for (let c = 0; c < width; c++) {
      const col = col0 + c * colStep
      const letter = str[col]
      if (letter === undefined) {
        break
      }
      if (reference && !isReference && letter === reference[col]) {
        out[base + c] = hoverPixel
      } else {
        const color = colorAt(col, letter)
        out[base + c] = color === undefined ? bgPixel : toPixel(color)
      }
    }
  }
  return out
}

// Getting a context object back is not the same as getting one that can do
// this: the headless render shim hands back a context carrying only measureText,
// which a truthiness test accepts and putImageData then does not survive. Name
// the methods the raster actually calls, so every caller degrades together.
function usableRasterCtx(ctx: unknown): ctx is RasterCtx {
  const c = ctx as Record<string, unknown> | null
  return (
    !!c &&
    typeof c.createImageData === 'function' &&
    typeof c.putImageData === 'function' &&
    typeof c.getImageData === 'function' &&
    typeof c.clearRect === 'function' &&
    typeof c.fillRect === 'function'
  )
}

function makeRasterCanvas(width: number, height: number) {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : typeof document !== 'undefined'
        ? Object.assign(document.createElement('canvas'), { width, height })
        : undefined
  const ctx = canvas?.getContext('2d', { willReadFrequently: true })
  return usableRasterCtx(ctx)
    ? { canvas: canvas as RasterCanvas, ctx }
    : undefined
}

function paint(pixels: Uint32Array, width: number, height: number) {
  const made = makeRasterCanvas(width, height)
  if (!made) {
    return undefined
  }
  const image = made.ctx.createImageData(width, height)
  new Uint32Array(image.data.buffer).set(pixels)
  made.ctx.putImageData(image, 0, 0)
  return made.canvas
}

let supported: boolean | undefined

// jsdom, and any browser without a 2d context, has no raster to draw; the
// per-cell painter in renderMSABlock stays the fallback
export function rasterSupported() {
  supported ??= !!makeRasterCanvas(1, 1)
  return supported
}

interface RasterCache {
  keys: unknown[]
  spec: RasterSpec
  numColumns: number
  numRows: number
  tiles: Map<string, RasterCanvas>
  thumbnail?: RasterCanvas
}

const caches = new WeakMap<object, RasterCache>()

// Everything a cell's color depends on. A change to any of them makes every
// cached tile stale, which a fresh cache expresses without tracking which.
function rasterKeys(model: MsaViewModel, theme: Theme) {
  return [
    model.columns,
    model.leaves,
    model.colorSchemeName,
    tileColorTable(model),
    model.relativeTo,
    theme.palette.action.hover,
    theme.palette.background.default,
  ]
}

function getCache(model: MsaViewModel, theme: Theme) {
  const keys = rasterKeys(model, theme)
  const prev = caches.get(model)
  if (prev && keys.every((key, i) => key === prev.keys[i])) {
    return prev
  }
  const next: RasterCache = {
    keys,
    spec: {
      rowNames: model.leaves.map(node => node.data.name),
      columns: model.columns,
      relativeTo: model.relativeTo,
      colorAt: tileColorFn(model),
      bg: theme.palette.background.default,
      hover: theme.palette.action.hover,
    },
    numColumns: model.numColumns,
    numRows: model.numRows,
    tiles: new Map(),
  }
  caches.set(model, next)
  return next
}

function getTile(cache: RasterCache, tileRow: number, tileCol: number) {
  const key = `${tileRow}_${tileCol}`
  const hit = cache.tiles.get(key)
  if (hit) {
    // re-inserting makes this the newest entry: a Map iterates in insertion
    // order, so its first key is the least recently used one
    cache.tiles.delete(key)
    cache.tiles.set(key, hit)
    return hit
  }
  const col0 = tileCol * rasterTileSize
  const row0 = tileRow * rasterTileSize
  const width = Math.min(rasterTileSize, cache.numColumns - col0)
  const height = Math.min(rasterTileSize, cache.numRows - row0)
  if (width <= 0 || height <= 0) {
    return undefined
  }
  const canvas = paint(
    rasterPixels({ spec: cache.spec, col0, row0, width, height }),
    width,
    height,
  )
  if (!canvas) {
    return undefined
  }
  cache.tiles.set(key, canvas)
  for (const stale of cache.tiles.keys()) {
    if (cache.tiles.size <= maxCachedTiles) {
      break
    }
    cache.tiles.delete(stale)
  }
  return canvas
}

/**
 * Paints the alignment background of one MSA block from cached
 * one-pixel-per-cell tiles. The tiles do not depend on the zoom level, so a zoom
 * frame costs a handful of drawImage calls instead of a fillRect per visible
 * cell -- which ran to 885ms per block at the minimum column width.
 */
export function drawMsaRaster({
  ctx,
  model,
  theme,
  offsetX,
  offsetY,
}: {
  ctx: CanvasRenderingContext2D
  model: MsaViewModel
  theme: Theme
  offsetX: number
  offsetY: number
}) {
  const { colWidth, rowHeight, blockSize, highResScaleFactor } = model
  const cache = getCache(model, theme)

  ctx.resetTransform()
  ctx.scale(highResScaleFactor, highResScaleFactor)
  ctx.translate(-offsetX, -offsetY)
  // below a pixel per cell a tile carries more cells than the block has room
  // for, so let the browser downsample it rather than letting whichever cell
  // landed last win
  ctx.imageSmoothingEnabled = colWidth < 1 || rowHeight < 1

  const tileWidth = rasterTileSize * colWidth
  const tileHeight = rasterTileSize * rowHeight
  const firstCol = Math.max(0, Math.floor(offsetX / tileWidth))
  const lastCol = Math.floor((offsetX + blockSize) / tileWidth)
  const firstRow = Math.max(0, Math.floor(offsetY / tileHeight))
  const lastRow = Math.floor((offsetY + blockSize) / tileHeight)

  for (let tileRow = firstRow; tileRow <= lastRow; tileRow++) {
    for (let tileCol = firstCol; tileCol <= lastCol; tileCol++) {
      const tile = getTile(cache, tileRow, tileCol)
      if (tile) {
        ctx.drawImage(
          tile,
          0,
          0,
          tile.width,
          tile.height,
          tileCol * tileWidth,
          tileRow * tileHeight,
          tile.width * colWidth,
          tile.height * rowHeight,
        )
      }
    }
  }
  ctx.resetTransform()
  ctx.imageSmoothingEnabled = true
}

/**
 * A raster canvas as a PNG data URI, for embedding in the SVG export.
 *
 * toDataURL is the synchronous read-back and only the DOM canvas has it, so an
 * OffscreenCanvas -- which is what the tile and thumbnail caches hold wherever
 * it exists -- gets copied onto one first. Returns undefined wherever the
 * read-back is unavailable (jsdom) rather than throwing, which is the signal to
 * fall back to drawing the thing in vector.
 */
export function canvasHref(canvas: RasterCanvas | undefined) {
  if (!canvas || typeof document === 'undefined') {
    return undefined
  }
  try {
    if (canvas instanceof HTMLCanvasElement) {
      return canvas.toDataURL('image/png')
    }
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')
    if (typeof ctx?.drawImage !== 'function') {
      return undefined
    }
    ctx.drawImage(canvas as CanvasImageSource, 0, 0)
    return out.toDataURL('image/png')
  } catch {
    return undefined
  }
}

// A canvas much past this many pixels fails to allocate, and the browser's own
// per-side limit is lower still, so a raster bigger than either samples down.
// The result is still drawn across the same rectangle -- it loses cell-exact
// detail at a size where no figure could show it anyway.
const maxImagePixels = 64e6
const maxImageSide = 16384

/**
 * The alignment rectangle [col0, col0+numCols) x [row0, row0+numRows) as a PNG
 * data URI, for the SVG export.
 *
 * SVG has no blit, so the export cannot reuse the tile cache the live canvas
 * draws from: one <image> is the whole background instead. That is the
 * difference between an export that scales and one that does not -- the vector
 * path emits a <rect> per cell, and a 200x500 alignment exhausts the heap
 * building them.
 *
 * Returns undefined wherever a canvas cannot be read back (jsdom, notably),
 * which is the signal to keep the per-cell path.
 */
export function rasterImageHref({
  model,
  theme,
  col0,
  row0,
  numCols,
  numRows,
}: {
  model: MsaViewModel
  theme: Theme
  col0: number
  row0: number
  numCols: number
  numRows: number
}) {
  if (numCols <= 0 || numRows <= 0 || typeof document === 'undefined') {
    return undefined
  }
  const cache = getCache(model, theme)
  let step = 1
  while (
    Math.ceil(numCols / step) * Math.ceil(numRows / step) > maxImagePixels ||
    Math.ceil(numCols / step) > maxImageSide ||
    Math.ceil(numRows / step) > maxImageSide
  ) {
    step *= 2
  }
  const width = Math.ceil(numCols / step)
  const height = Math.ceil(numRows / step)

  return canvasHref(
    paint(
      rasterPixels({
        spec: cache.spec,
        col0,
        row0,
        width,
        height,
        colStep: step,
        rowStep: step,
      }),
      width,
      height,
    ),
  )
}

/**
 * The whole alignment sampled down to a strip small enough to sit behind the
 * minimap thumb, cached alongside the block tiles because it goes stale under
 * exactly the same conditions.
 */
export function msaThumbnail({
  model,
  theme,
  height,
}: {
  model: MsaViewModel
  theme: Theme
  height: number
}) {
  const cache = getCache(model, theme)
  const { numColumns, numRows } = cache
  if (numColumns <= 0 || numRows <= 0) {
    return undefined
  }
  if (!cache.thumbnail) {
    const colStep = Math.max(1, Math.ceil(numColumns / maxThumbnailColumns))
    const rowStep = Math.max(1, Math.ceil(numRows / height))
    const w = Math.ceil(numColumns / colStep)
    const h = Math.ceil(numRows / rowStep)
    cache.thumbnail = paint(
      rasterPixels({
        spec: cache.spec,
        col0: 0,
        row0: 0,
        width: w,
        height: h,
        colStep,
        rowStep,
      }),
      w,
      h,
    )
  }
  return cache.thumbnail
}

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
 * canvas and reading it back parses hex, rgb(), hsl() and named colors; the
 * cache resolves each distinct color once per session.
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

function cellPixelFn(spec: RasterSpec, toPixel: (css: string) => number) {
  const { columns, relativeTo, colorAt, bg, hover } = spec
  const bgPixel = toPixel(bg)
  const hoverPixel = toPixel(hover)
  const reference = relativeTo ? columns.get(relativeTo) : undefined
  return (name: string, col: number, letter: string) => {
    if (reference && name !== relativeTo && letter === reference[col]) {
      return hoverPixel
    }
    const color = colorAt(col, letter)
    return color === undefined ? bgPixel : toPixel(color)
  }
}

/**
 * Packs a rectangle of the alignment into one pixel per cell, in `rowNames`
 * order, ready to hand to putImageData. Cells past the end of a row, and rows
 * with no sequence, stay transparent, as in the per-cell painter.
 *
 * `colStep`/`rowStep` sample every nth cell, which fits a whole alignment into
 * the minimap's 12px bar. `colSpan`/`rowSpan` average each block of that many
 * cells into one pixel, so a zoom below a device pixel per column still shows
 * every column's color without blending neighbouring rows.
 */
export function rasterPixels({
  spec,
  col0,
  row0,
  width,
  height,
  colStep = 1,
  rowStep = 1,
  colSpan = 1,
  rowSpan = 1,
  toPixel = cssColorToPixel,
  out = new Uint32Array(width * height),
}: {
  spec: RasterSpec
  col0: number
  row0: number
  width: number
  height: number
  colStep?: number
  rowStep?: number
  colSpan?: number
  rowSpan?: number
  toPixel?: (css: string) => number
  out?: Uint32Array
}) {
  if (colSpan > 1 || rowSpan > 1) {
    averagePixels({
      spec,
      col0,
      row0,
      width,
      height,
      colSpan,
      rowSpan,
      toPixel,
      out,
    })
    return out
  }
  const { rowNames, columns } = spec
  const cellPixel = cellPixelFn(spec, toPixel)

  for (let r = 0; r < height; r++) {
    const name = rowNames[row0 + r * rowStep]
    if (name === undefined) {
      break
    }
    const str = columns.get(name)
    if (!str) {
      continue
    }
    const base = r * width
    for (let c = 0; c < width; c++) {
      const col = col0 + c * colStep
      const letter = str[col]
      if (letter === undefined) {
        break
      }
      out[base + c] = cellPixel(name, col, letter)
    }
  }
  return out
}

function averagePixels({
  spec,
  col0,
  row0,
  width,
  height,
  colSpan,
  rowSpan,
  toPixel,
  out,
}: {
  spec: RasterSpec
  col0: number
  row0: number
  width: number
  height: number
  colSpan: number
  rowSpan: number
  toPixel: (css: string) => number
  out: Uint32Array
}) {
  const { rowNames, columns } = spec
  const cellPixel = cellPixelFn(spec, toPixel)
  const cells = colSpan * rowSpan
  const rShift = littleEndian ? 0 : 24
  const gShift = littleEndian ? 8 : 16
  const bShift = littleEndian ? 16 : 8
  const aShift = littleEndian ? 24 : 0
  const names: string[] = []
  const strs: string[] = []

  for (let r = 0; r < height; r++) {
    names.length = 0
    strs.length = 0
    for (let dr = 0; dr < rowSpan; dr++) {
      const name = rowNames[row0 + r * rowSpan + dr]
      const str = name === undefined ? undefined : columns.get(name)
      if (name !== undefined && str) {
        names.push(name)
        strs.push(str)
      }
    }
    const base = r * width
    for (let c = 0; c < width; c++) {
      // premultiplied, so a cell past the end of a row dilutes the alpha of its
      // pixel rather than darkening its color
      let sumR = 0
      let sumG = 0
      let sumB = 0
      let sumA = 0
      for (let i = 0; i < strs.length; i++) {
        const str = strs[i]!
        const name = names[i]!
        for (let dc = 0; dc < colSpan; dc++) {
          const col = col0 + c * colSpan + dc
          const letter = str[col]
          if (letter === undefined) {
            break
          }
          const p = cellPixel(name, col, letter)
          const a = (p >>> aShift) & 255
          sumR += ((p >>> rShift) & 255) * a
          sumG += ((p >>> gShift) & 255) * a
          sumB += ((p >>> bShift) & 255) * a
          sumA += a
        }
      }
      out[base + c] =
        sumA === 0
          ? 0
          : packRgba(
              Math.round(sumR / sumA),
              Math.round(sumG / sumA),
              Math.round(sumB / sumA),
              Math.round(sumA / cells),
            )
    }
  }
}

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

function paint(
  width: number,
  height: number,
  fill: (out: Uint32Array) => void,
) {
  const made = makeRasterCanvas(width, height)
  if (!made) {
    return undefined
  }
  const image = made.ctx.createImageData(width, height)
  fill(new Uint32Array(image.data.buffer))
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
  thumbnail?: { height: number; canvas: RasterCanvas | undefined }
}

const caches = new WeakMap<object, RasterCache>()

// Everything a cell's color depends on; a change to any of them starts a fresh
// cache.
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

// Cells averaged into one tile pixel along an axis: the smallest power of two
// that brings a pixel back to at least one device pixel. Powers of two keep the
// number of distinct tile sets a zoom sweep builds to a handful.
function cellsPerPixel(devicePixelsPerCell: number) {
  return devicePixelsPerCell >= 1
    ? 1
    : 2 ** Math.ceil(Math.log2(1 / devicePixelsPerCell))
}

function getTile({
  cache,
  tileRow,
  tileCol,
  colSpan,
  rowSpan,
}: {
  cache: RasterCache
  tileRow: number
  tileCol: number
  colSpan: number
  rowSpan: number
}) {
  const key = `${colSpan}_${rowSpan}_${tileRow}_${tileCol}`
  const hit = cache.tiles.get(key)
  if (hit) {
    // re-inserting makes this the newest entry: a Map iterates in insertion
    // order, so its first key is the least recently used one
    cache.tiles.delete(key)
    cache.tiles.set(key, hit)
    return hit
  }
  const col0 = tileCol * rasterTileSize * colSpan
  const row0 = tileRow * rasterTileSize * rowSpan
  const width = Math.min(
    rasterTileSize,
    Math.ceil((cache.numColumns - col0) / colSpan),
  )
  const height = Math.min(
    rasterTileSize,
    Math.ceil((cache.numRows - row0) / rowSpan),
  )
  if (width <= 0 || height <= 0) {
    return undefined
  }
  const canvas = paint(width, height, out => {
    rasterPixels({
      spec: cache.spec,
      col0,
      row0,
      width,
      height,
      colSpan,
      rowSpan,
      out,
    })
  })
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
 * frame costs a handful of drawImage calls. A fillRect per visible cell measured
 * 885ms per block at the minimum column width.
 *
 * Below a device pixel per cell the tiles average cells together, per axis.
 * The browser's image smoothing blurs both axes, which turns every row
 * boundary into a gradient at fit-to-width, where only the columns are narrow.
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
  const colSpan = cellsPerPixel(colWidth * highResScaleFactor)
  const rowSpan = cellsPerPixel(rowHeight * highResScaleFactor)

  ctx.resetTransform()
  ctx.scale(highResScaleFactor, highResScaleFactor)
  ctx.translate(-offsetX, -offsetY)
  ctx.imageSmoothingEnabled = false

  const pixelWidth = colWidth * colSpan
  const pixelHeight = rowHeight * rowSpan
  const tileWidth = rasterTileSize * pixelWidth
  const tileHeight = rasterTileSize * pixelHeight
  const firstCol = Math.max(0, Math.floor(offsetX / tileWidth))
  const lastCol = Math.floor((offsetX + blockSize) / tileWidth)
  const firstRow = Math.max(0, Math.floor(offsetY / tileHeight))
  const lastRow = Math.floor((offsetY + blockSize) / tileHeight)

  for (let tileRow = firstRow; tileRow <= lastRow; tileRow++) {
    for (let tileCol = firstCol; tileCol <= lastCol; tileCol++) {
      const tile = getTile({ cache, tileRow, tileCol, colSpan, rowSpan })
      if (tile) {
        ctx.drawImage(
          tile,
          0,
          0,
          tile.width,
          tile.height,
          tileCol * tileWidth,
          tileRow * tileHeight,
          tile.width * pixelWidth,
          tile.height * pixelHeight,
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
 * toDataURL is the synchronous read-back. The DOM canvas and a headless node
 * canvas have it; a browser OffscreenCanvas, which the tile and thumbnail
 * caches hold where it exists, is copied onto a DOM canvas first. Returns
 * undefined where read-back is unavailable (jsdom), and the caller then draws
 * in vector.
 */
export function canvasHref(canvas: RasterCanvas | undefined) {
  if (!canvas) {
    return undefined
  }
  try {
    if ('toDataURL' in canvas && typeof canvas.toDataURL === 'function') {
      return canvas.toDataURL('image/png')
    }
    if (typeof document === 'undefined') {
      return undefined
    }
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')
    if (typeof ctx?.drawImage !== 'function') {
      return undefined
    }
    ctx.drawImage(canvas, 0, 0)
    return out.toDataURL('image/png')
  } catch {
    return undefined
  }
}

// A canvas much past this many pixels fails to allocate, and the browser's
// per-side limit is lower still, so a larger raster averages down per axis and
// is drawn across the same rectangle. An alignment that hits the limit on
// columns alone keeps every row.
const maxImagePixels = 64e6
const maxImageSide = 16384

/**
 * The alignment rectangle [col0, col0+numCols) x [row0, row0+numRows) as a PNG
 * data URI, for the SVG export.
 *
 * SVG has no blit, so the export draws the whole background as one <image>. The
 * vector path emits a <rect> per cell, and a 200x500 alignment exhausts the
 * heap building them.
 *
 * Returns undefined where a canvas cannot be read back (jsdom), and the caller
 * then keeps the per-cell path.
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
  let colSpan = 1
  let rowSpan = 1
  while (Math.ceil(numCols / colSpan) > maxImageSide) {
    colSpan *= 2
  }
  while (Math.ceil(numRows / rowSpan) > maxImageSide) {
    rowSpan *= 2
  }
  while (
    Math.ceil(numCols / colSpan) * Math.ceil(numRows / rowSpan) >
    maxImagePixels
  ) {
    if (numCols / colSpan >= numRows / rowSpan) {
      colSpan *= 2
    } else {
      rowSpan *= 2
    }
  }
  const width = Math.ceil(numCols / colSpan)
  const height = Math.ceil(numRows / rowSpan)

  return canvasHref(
    paint(width, height, out => {
      rasterPixels({
        spec: cache.spec,
        col0,
        row0,
        width,
        height,
        colSpan,
        rowSpan,
        out,
      })
    }),
  )
}

/**
 * The whole alignment sampled down to a strip behind the minimap thumb, cached
 * with the block tiles since the same keys invalidate both.
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
  // keyed on the requested height as well as the cache: rowStep is derived from
  // it, so a thumbnail built for a different bar height is the wrong sampling
  if (cache.thumbnail?.height !== height) {
    const colStep = Math.max(1, Math.ceil(numColumns / maxThumbnailColumns))
    const rowStep = Math.max(1, Math.ceil(numRows / height))
    const w = Math.ceil(numColumns / colStep)
    const h = Math.ceil(numRows / rowStep)
    cache.thumbnail = {
      height,
      canvas: paint(w, h, out => {
        rasterPixels({
          spec: cache.spec,
          col0: 0,
          row0: 0,
          width: w,
          height: h,
          colStep,
          rowStep,
          out,
        })
      }),
    }
  }
  return cache.thumbnail.canvas
}

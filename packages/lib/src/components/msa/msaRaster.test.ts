// @vitest-environment jsdom
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { cssColorToPixel, drawMsaRaster, rasterPixels } from './msaRaster.ts'

import type { RasterSpec } from './msaRaster.ts'

// the stub context resolves a color by parsing '#rrggbb', so every color the
// raster asks about in this file is written that way
function hexBytes(css: string) {
  const hex = css.replace('#', '')
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    255,
  ]
}

interface Draw {
  image: { width: number; height: number }
  args: number[]
  smoothing: boolean
}
const drawn: Draw[] = []

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function () {
    let fillStyle = '#000000'
    return {
      get fillStyle() {
        return fillStyle
      },
      set fillStyle(v: string) {
        fillStyle = v
      },
      imageSmoothingEnabled: true,
      font: '10px sans-serif',
      measureText: (t: string) => ({ width: t.length * 6 }),
      clearRect: () => {},
      fillRect: () => {},
      resetTransform: () => {},
      scale: () => {},
      translate: () => {},
      getImageData: () => ({
        data: Uint8ClampedArray.from(hexBytes(fillStyle)),
      }),
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
      putImageData: () => {},
      drawImage(
        this: { imageSmoothingEnabled: boolean },
        image: { width: number; height: number },
        ...args: number[]
      ) {
        drawn.push({ image, args, smoothing: this.imageSmoothingEnabled })
      },
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

const spec: RasterSpec = {
  rowNames: ['a', 'b', 'c'],
  columns: new Map([
    ['a', 'MKL'],
    ['b', 'MKL'],
    ['c', 'MK'],
  ]),
  relativeTo: 'a',
  colorAt: (_col, letter) => (letter === 'M' ? '#ff0000' : undefined),
  bg: '#000000',
  hover: '#00ff00',
}

const ids: Record<string, number> = { '#ff0000': 1, '#000000': 2, '#00ff00': 3 }
const toPixel = (css: string) => ids[css]!

test('one pixel per cell, reference matches and short rows', () => {
  const px = rasterPixels({
    spec,
    col0: 0,
    row0: 0,
    width: 3,
    height: 4,
    toPixel,
  })

  // the reference row itself keeps its scheme colors
  expect([...px.slice(0, 3)]).toEqual([1, 2, 2])
  // every cell of an identical row reads as a match
  expect([...px.slice(3, 6)]).toEqual([3, 3, 3])
  // past the end of a short row, and past the last row, stays transparent
  expect([...px.slice(6, 9)]).toEqual([3, 3, 0])
  expect([...px.slice(9, 12)]).toEqual([0, 0, 0])
})

test('averaging covers columns without touching rows', () => {
  const px = rasterPixels({
    spec: {
      ...spec,
      relativeTo: undefined,
      colorAt: (_col, letter) =>
        ({ M: '#ff0000', K: '#0000ff', L: '#00ff00' })[letter],
    },
    col0: 0,
    row0: 0,
    width: 2,
    height: 3,
    colSpan: 2,
    toPixel: cssColorToPixel,
  })
  const rgba = (p: number) => [...new Uint8Array(Uint32Array.from([p]).buffer)]

  // the two columns of a pixel average together...
  expect(rgba(px[0]!)).toEqual([128, 0, 128, 255])
  // ...and the pixel that covers only one of its two columns keeps that
  // column's color at half alpha rather than borrowing the row below
  expect(rgba(px[1]!)).toEqual([0, 255, 0, 128])
  // every row is still its own row of pixels
  expect(rgba(px[2]!)).toEqual([128, 0, 128, 255])
  expect(rgba(px[4]!)).toEqual([128, 0, 128, 255])
  // 'c' has no cells at all under its second pixel
  expect(px[5]).toBe(0)
})

test('sampling steps over columns and rows', () => {
  const px = rasterPixels({
    spec,
    col0: 0,
    row0: 0,
    width: 2,
    height: 2,
    colStep: 2,
    rowStep: 2,
    toPixel,
  })
  // the second sampled column falls past the end of the short row 'c'
  expect([...px]).toEqual([1, 2, 3, 0])
})

function make() {
  const model = MSAModelF().create({
    id: 'raster',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: '>a\nMKLVIL\n>b\nMRLVIL\n>c\nMKLAIL' },
  })
  model.setWidth(1000)
  return model
}

function tilesFor(model: ReturnType<typeof make>) {
  drawn.length = 0
  const ctx = document.createElement('canvas').getContext('2d')!
  drawMsaRaster({ ctx, model, theme: theme(), offsetX: 0, offsetY: 0 })
  return [...drawn]
}

function imagesFor(model: ReturnType<typeof make>) {
  return tilesFor(model).map(d => d.image)
}

// only the two palette entries the raster reads
const theme = () =>
  ({
    palette: {
      action: { hover: '#00ff00' },
      background: { default: '#ffffff' },
    },
  }) as never

test('a zoom reuses the tiles, a recolor rebuilds them', () => {
  const model = make()
  const tile = imagesFor(model)[0]
  expect(tile).toBeDefined()

  model.setColWidth(3)
  model.setRowHeight(2)
  expect(imagesFor(model)[0]).toBe(tile)

  model.setColorSchemeName('clustalx_protein_dynamic')
  expect(imagesFor(model)[0]).not.toBe(tile)
})

test('a column zoom past a pixel per cell averages columns, not rows', () => {
  const model = make()
  model.setColWidth(0.25)
  const [draw] = tilesFor(model)

  expect(draw).toBeDefined()
  // smoothing would blur the rows together, so the tile arrives pre-averaged
  // along the columns it needs and is blitted one row per row
  expect(draw!.smoothing).toBe(false)
  expect(draw!.image.width).toBe(Math.ceil(model.numColumns / 4))
  expect(draw!.image.height).toBe(model.numRows)
  const [, , , , , , width, height] = draw!.args
  expect(width).toBeCloseTo(draw!.image.width * model.colWidth * 4)
  expect(height).toBeCloseTo(model.numRows * model.rowHeight)
})

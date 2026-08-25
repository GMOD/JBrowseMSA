// @vitest-environment jsdom
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { drawMsaRaster, rasterPixels } from './msaRaster.ts'

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

const drawn: unknown[] = []

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
      drawImage: (image: unknown) => {
        drawn.push(image)
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
  const tile = tilesFor(model)[0]
  expect(tile).toBeDefined()

  model.setColWidth(3)
  model.setRowHeight(2)
  expect(tilesFor(model)[0]).toBe(tile)

  model.setColorSchemeName('clustalx_protein_dynamic')
  expect(tilesFor(model)[0]).not.toBe(tile)
})

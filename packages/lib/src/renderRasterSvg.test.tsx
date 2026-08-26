// @vitest-environment jsdom
//
// The SVG export's raster background. jsdom has no canvas, so the export falls
// back to a <rect> per cell there and every other export test exercises that
// path; this file supplies the canvas the raster needs and checks the export
// takes it instead.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

const dataUrl = 'data:image/png;base64,STUB'

// enough of a 2d context for the raster: a color parser, an ImageData that is
// really backed by bytes, and a canvas that reads back
beforeAll(() => {
  enableStaticRendering(true)
  globalThis.DOMMatrix = class {
    a = 1
    b = 0
    c = 0
    d = 1
    e = 0
    f = 0
    constructor(init?: number[]) {
      const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = init ?? []
      Object.assign(this, { a, b, c, d, e, f })
    }
    multiply(o: any) {
      return new (globalThis.DOMMatrix as any)([
        this.a * o.a + this.c * o.b,
        this.b * o.a + this.d * o.b,
        this.a * o.c + this.c * o.d,
        this.b * o.c + this.d * o.d,
        this.a * o.e + this.c * o.f + this.e,
        this.b * o.e + this.d * o.f + this.f,
      ])
    }
    translate(x: number, y = 0) {
      return this.multiply(
        new (globalThis.DOMMatrix as any)([1, 0, 0, 1, x, y]),
      )
    }
    scale(x: number, y = x) {
      return this.multiply(
        new (globalThis.DOMMatrix as any)([x, 0, 0, y, 0, 0]),
      )
    }
  } as any
  globalThis.DOMPoint = class {
    constructor(
      public x = 0,
      public y = 0,
    ) {}
    matrixTransform(m: any) {
      return new (globalThis.DOMPoint as any)(
        m.a * this.x + m.c * this.y + m.e,
        m.b * this.x + m.d * this.y + m.f,
      )
    }
  } as any

  HTMLCanvasElement.prototype.getContext = function () {
    let font = '10px sans-serif'
    let fillStyle = '#000000'
    return {
      get font() {
        return font
      },
      set font(v: string) {
        font = v
      },
      get fillStyle() {
        return fillStyle
      },
      set fillStyle(v: string) {
        fillStyle = v
      },
      measureText: (t: string) => ({
        width: t.length * (Number.parseFloat(font) || 10) * 0.6,
      }),
      clearRect: () => {},
      fillRect: () => {},
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
      putImageData: () => {},
      getImageData: () => ({ data: Uint8ClampedArray.from([1, 2, 3, 255]) }),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = () => dataUrl
})

function makeModel(rows: number, cols: number) {
  const letters = 'ACDEFGHIKLMNPQRSTVWY'
  const msa = Array.from({ length: rows }, (_, r) => {
    let s = ''
    for (let c = 0; c < cols; c++) {
      s += letters[(r * 7 + c * 3) % letters.length]
    }
    return `>seq${r}\n${s}`
  }).join('\n')
  const model = MSAModelF().create({
    id: 'raster',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa },
  })
  model.setWidth(800)
  return model
}

function exportEntire(model: ReturnType<typeof makeModel>) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
}

test('the background is one image, not a rect per cell', async () => {
  const model = makeModel(40, 300)
  expect(model.bgColor).toBe(true)
  expect(model.actuallyShowDomains).toBe(false)

  const svg = await exportEntire(model)
  const images = [...svg.matchAll(/<image[^>]*>/g)].map(m => m[0])

  expect(images).toHaveLength(1)
  expect(images[0]).toContain(dataUrl)
  // the alignment's own rectangle, one pixel per cell scaled up by whole cells
  expect(images[0]).toContain(`width="${300 * model.colWidth}"`)
  expect(images[0]).toContain(`height="${40 * model.rowHeight}"`)
  expect(images[0]).toContain('image-rendering="pixelated"')

  // 12000 cells would have been 12000 rects
  expect((svg.match(/<rect/g) ?? []).length).toBeLessThan(10)
})

test('letters still draw on top of the raster', async () => {
  const model = makeModel(4, 10)
  expect(model.showMsaLetters).toBe(true)

  const svg = await exportEntire(model)

  expect(svg).toContain('<image')
  expect((svg.match(/<text/g) ?? []).length).toBeGreaterThanOrEqual(40)
})

test('the domain overlay keeps the vector path, which paints its own boxes', async () => {
  const model = makeModel(4, 10)
  model.setDomains({
    seq0: {
      xref: [{ id: 'seq0' }],
      matches: [
        {
          signature: {
            entry: { name: 'Kinase', accession: 'PF00069', description: '' },
          },
          locations: [{ start: 1, end: 5 }],
        },
      ],
    },
  })
  expect(model.actuallyShowDomains).toBe(true)

  expect(await exportEntire(model)).not.toContain('<image')
})

test('turning background color off leaves nothing for a raster to draw', async () => {
  const model = makeModel(4, 10)
  model.setBgColor(false)

  expect(await exportEntire(model)).not.toContain('<image')
})

test('the exported minimap carries the alignment thumbnail', async () => {
  const model = makeModel(20, 2000)
  expect(model.showHorizontalScrollbar).toBe(true)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
  })

  // the bar is the same downsampled alignment the live minimap draws, rather
  // than the empty outline the export used to leave
  const bar = [...svg.matchAll(/<image[^>]*>/g)]
    .map(m => m[0])
    .find(i => i.includes('height="12"'))
  expect(bar).toBeDefined()
  expect(bar).toContain(dataUrl)
  expect(bar).toContain(`width="${model.msaCanvasWidth}"`)
})

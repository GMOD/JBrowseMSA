// @vitest-environment jsdom
//
// The SVG export's raster background. jsdom has no canvas, so the export falls
// back to a <rect> per cell there and every other export test exercises that
// path; this file supplies the canvas the raster needs and checks the export
// takes it instead.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import {
  createTestModel,
  installSvgTestEnv,
  syntheticProteinMsa,
} from './svgTestUtil.ts'

const dataUrl = 'data:image/png;base64,STUB'

// enough of a 2d context for the raster: a color parser, an ImageData that is
// really backed by bytes, and a canvas that reads back
beforeAll(() => {
  installSvgTestEnv({
    fillStyle: '#000000',
    clearRect: () => {},
    fillRect: () => {},
    createImageData: ((width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })) as unknown as CanvasRenderingContext2D['createImageData'],
    putImageData: () => {},
    getImageData: (() => ({
      data: Uint8ClampedArray.from([1, 2, 3, 255]),
    })) as unknown as CanvasRenderingContext2D['getImageData'],
  })
  HTMLCanvasElement.prototype.toDataURL = () => dataUrl
})

function makeModel(rows: number, cols: number) {
  return createTestModel({
    id: 'raster',
    data: { msa: syntheticProteinMsa(rows, cols) },
  })
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

test('each track is named in the tree column beside it', async () => {
  const model = makeModel(4, 40)
  model.toggleTrack('sequence-logo')
  const names = model.turnedOnTracks.map(t => t.model.name)
  expect(names.length).toBeGreaterThan(1)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })

  for (const name of names) {
    expect(svg).toContain(`>${name}</text>`)
  }
})

import * as fs from 'node:fs'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { JSDOM } from 'jsdom'
import { enableStaticRendering } from 'mobx-react'

/**
 * jsdom has no pixels, so without this the export draws a <rect> per cell and a
 * large alignment exhausts the heap. @napi-rs/canvas is an optional dependency
 * with prebuilt binaries; when it installed, its canvas stands in for
 * OffscreenCanvas and the raster background becomes one <image>.
 */
async function installNodeCanvas(g: Record<string, unknown>) {
  const napi = await import('@napi-rs/canvas').catch(() => undefined)
  if (!napi) {
    return
  }
  const { createCanvas } = napi
  g.OffscreenCanvas = class {
    constructor(width: number, height: number) {
      return createCanvas(width, height)
    }
  }
}

export async function exportSvg({
  msaFile,
  treeFile,
  gffFile,
  outputFile,
  colorScheme,
  height,
  width,
  treeAreaWidth,
  colWidth,
  rowHeight,
}: {
  msaFile: string
  treeFile?: string
  gffFile?: string
  outputFile: string
  colorScheme: string
  height: number
  width: number
  treeAreaWidth?: number
  colWidth?: number
  rowHeight?: number
}) {
  const { MSAModelF, renderToSvg, installHeadlessRenderEnv } =
    await import('react-msaview')

  enableStaticRendering(true)
  // jsdom provides document/window/SVGElement needed by svgcanvas and
  // measureTextCanvas; installHeadlessRenderEnv fills in what jsdom omits
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const g = globalThis as Record<string, unknown>
  g.window = dom.window
  g.document = dom.window.document
  installHeadlessRenderEnv(dom.window)
  await installNodeCanvas(g)

  const theme = createJBrowseTheme()
  const msa = fs.readFileSync(msaFile, 'utf8')
  const tree = treeFile ? fs.readFileSync(treeFile, 'utf8') : ''
  const gff = gffFile ? fs.readFileSync(gffFile, 'utf8') : undefined

  const model = MSAModelF().create({
    // a fixed id keeps the clipPath ids stable, so exporting the same input
    // twice gives the same bytes -- an mst-generated one differs every run
    id: 'msaview-export',
    type: 'MsaView',
    height,
    colorSchemeName: colorScheme,
    // an entire-alignment export is sized by the cells, not by --width/--height:
    // these are what scale the figure, and shrinking them past the letter
    // threshold is what turns a long alignment into a readable block diagram
    ...(colWidth === undefined ? {} : { colWidth }),
    ...(rowHeight === undefined ? {} : { rowHeight }),
    data: { msa, tree, ...(gff ? { gff } : {}) },
  })
  if (treeAreaWidth !== undefined) {
    model.setTreeAreaWidth(treeAreaWidth)
  }
  model.setWidth(width)

  const svg = await renderToSvg(model, {
    theme,
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
  fs.writeFileSync(outputFile, svg)
}

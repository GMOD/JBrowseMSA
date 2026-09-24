import * as fs from 'node:fs'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { JSDOM } from 'jsdom'
import { enableStaticRendering } from 'mobx-react'
import { annotationTextToGFF } from 'msa-parsers'

import type { MSAFormat } from 'msa-parsers'

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
  format,
  tracks,
  viewport,
  minimap,
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
  format?: MSAFormat
  tracks?: string[]
  viewport?: boolean
  minimap?: boolean
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
  const gff = gffFile
    ? annotationTextToGFF(fs.readFileSync(gffFile, 'utf8'))
    : undefined

  const model = MSAModelF().create({
    // a fixed id keeps clipPath ids, and so the output bytes, stable across runs
    id: 'msaview-export',
    type: 'MsaView',
    height,
    colorSchemeName: colorScheme,
    // an entire-alignment export is sized by cell size, not --width/--height;
    // cells below the letter threshold draw a long alignment as blocks
    ...(colWidth === undefined ? {} : { colWidth }),
    ...(rowHeight === undefined ? {} : { rowHeight }),
    ...(format ? { msaFormat: format } : {}),
    data: { msa, tree, ...(gff ? { gff } : {}) },
  })
  if (treeAreaWidth !== undefined) {
    model.setTreeAreaWidth(treeAreaWidth)
  }
  model.setWidth(width)

  // exactly the named tracks, or `all`; a name matching no track is reported
  if (tracks) {
    const ids = new Set(model.tracks.map(t => t.model.id))
    for (const name of tracks) {
      if (name !== 'all' && !ids.has(name)) {
        console.warn(
          `no track "${name}" here; this alignment has ${[...ids].join(', ')}`,
        )
      }
    }
    const wanted = (id: string) => tracks.includes('all') || tracks.includes(id)
    for (const { model: track } of model.tracks) {
      const on = model.turnedOnTracks.some(t => t.model.id === track.id)
      if (on !== wanted(track.id)) {
        model.toggleTrack(track.id)
      }
    }
  }

  const svg = await renderToSvg(model, {
    theme,
    exportType: viewport ? 'viewport' : 'entire',
    includeMinimap: minimap,
    includeTracks: !!tracks && model.turnedOnTracks.length > 0,
  })
  fs.writeFileSync(outputFile, svg)
}

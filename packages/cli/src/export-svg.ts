import * as fs from 'node:fs'
import * as path from 'node:path'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { JSDOM } from 'jsdom'
import { enableStaticRendering } from 'mobx-react'
import { annotationTextToGFF } from 'msa-parsers'

import { fetchWithRetry } from './fetchWithRetry.ts'

import type { MSAFormat } from 'msa-parsers'
import type { MsaSpec } from 'react-msaview'

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

const FILEHANDLES = [
  ['msaFilehandle', 'msa'],
  ['treeFilehandle', 'tree'],
  ['gffFilehandle', 'gff'],
  ['treeMetadataFilehandle', 'treeMetadata'],
] as const

interface Location {
  uri?: string
  localPath?: string
}

async function readLocation(location: Location, baseDir: string) {
  const where = location.uri ?? location.localPath
  if (!where) {
    throw new Error(`a filehandle in the spec has no uri or localPath`)
  }
  if (/^https?:\/\//.test(where)) {
    const res = await fetchWithRetry(where)
    if (!res.ok) {
      throw new Error(`${where}: ${res.status} ${res.statusText}`)
    }
    return res.text()
  }
  return fs.readFileSync(path.resolve(baseDir, where), 'utf8')
}

/**
 * The spec file as a snapshot, with every filehandle read into `data` so the
 * model is complete on create. A relative path resolves against the spec
 * file's directory.
 */
async function readSpec(specFile: string) {
  const expandSpec = (await import('react-msaview')).expandSpec
  const json = JSON.parse(fs.readFileSync(specFile, 'utf8')) as {
    msaview?: MsaSpec
  } & MsaSpec
  const snapshot = expandSpec(json.msaview ?? json)
  const data = { ...(snapshot.data as Record<string, string> | undefined) }
  for (const [key, field] of FILEHANDLES) {
    const location = snapshot[key] as Location | undefined
    if (location) {
      data[field] ??= await readLocation(location, path.dirname(specFile))
      delete snapshot[key]
    }
  }
  return { ...snapshot, data }
}

export async function exportSvg({
  specFile,
  msaFile,
  treeFile,
  gffFile,
  outputFile,
  colorScheme,
  height,
  width = 1200,
  treeAreaWidth,
  colWidth,
  rowHeight,
  format,
  tracks,
  viewport,
  minimap,
}: {
  specFile?: string
  msaFile?: string
  treeFile?: string
  gffFile?: string
  outputFile: string
  colorScheme?: string
  height?: number
  width?: number
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
  const spec: Record<string, unknown> & { data?: Record<string, string> } =
    specFile ? await readSpec(specFile) : {}
  const data = { ...spec.data }
  if (msaFile) {
    data.msa = fs.readFileSync(msaFile, 'utf8')
  }
  if (treeFile) {
    data.tree = fs.readFileSync(treeFile, 'utf8')
  }
  if (gffFile) {
    data.gff = fs.readFileSync(gffFile, 'utf8')
  }
  if (data.gff) {
    data.gff = annotationTextToGFF(data.gff)
  }
  if (!data.msa && !data.tree) {
    throw new Error(
      'nothing to draw: give --msa, or a --spec with an msa or a tree',
    )
  }

  const model = MSAModelF().create({
    colorSchemeName: 'maeditor',
    height: 600,
    ...spec,
    // a fixed id keeps clipPath ids, and so the output bytes, stable across runs
    id: 'msaview-export',
    type: 'MsaView',
    ...(colorScheme === undefined ? {} : { colorSchemeName: colorScheme }),
    ...(height === undefined ? {} : { height }),
    // an entire-alignment export is sized by cell size, not --width/--height;
    // cells below the letter threshold draw a long alignment as blocks
    ...(colWidth === undefined ? {} : { colWidth }),
    ...(rowHeight === undefined ? {} : { rowHeight }),
    ...(format ? { msaFormat: format } : {}),
    data,
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
    includeTracks: (!!tracks || !!specFile) && model.turnedOnTracks.length > 0,
  })
  fs.writeFileSync(outputFile, svg)
}

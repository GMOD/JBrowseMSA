import * as fs from 'node:fs'
import * as path from 'node:path'

import { enableStaticRendering } from 'mobx-react'

import { fetchWithRetry } from './fetchWithRetry.ts'
import { isMsaSpec, isRecord, isViewerProps, readJson } from './json.ts'
import { loadJsdom } from './loadJsdom.ts'
import { checkConverter, figureFormat, writeFigure } from './writeFigure.ts'

import type { MSAFormat } from 'msa-parsers'

/**
 * The faces `sans-serif` resolves to on macOS, Windows and Linux desktops. Skia
 * has no fontconfig here, so the generic `sans-serif` the renderers name falls
 * to the first family it loaded, which on a system with only DejaVu is DejaVu
 * Sans Mono, and every label then measures alike.
 */
const SANS_FACES = [
  'Helvetica',
  'Arial',
  'Liberation Sans',
  'DejaVu Sans',
  'Noto Sans',
]

/**
 * jsdom has no pixels, so without this the export draws a <rect> per cell and a
 * large alignment exhausts the heap. @napi-rs/canvas is an optional dependency
 * with prebuilt binaries; when it installed, its canvas stands in for
 * OffscreenCanvas, the raster background becomes one <image>, and the returned
 * context measures text with the installed fonts.
 */
async function installNodeCanvas(g: Record<string, unknown>) {
  const napi = await import('@napi-rs/canvas').catch(() => undefined)
  if (!napi) {
    return undefined
  }
  const { createCanvas, GlobalFonts } = napi
  const sans = SANS_FACES.find(face => GlobalFonts.has(face))
  if (sans) {
    GlobalFonts.setAlias(sans, 'sans-serif')
  }
  g.OffscreenCanvas = class {
    constructor(width: number, height: number) {
      return createCanvas(width, height)
    }
  }
  return createCanvas(1, 1).getContext('2d')
}

/**
 * Each residue letter is an SVG element. Measured on a 1000-column alignment:
 * 500 rows take 60s and 3.4GB, and a 1840 x 966 alignment aborts at 4.5GB.
 */
export const MAX_EXPORT_LETTERS = 500_000

const FILEHANDLES = [
  ['msaFilehandle', 'msa'],
  ['treeFilehandle', 'tree'],
  ['gffFilehandle', 'gff'],
  ['treeMetadataFilehandle', 'treeMetadata'],
] as const

function locationPath(location: unknown) {
  const where = isRecord(location)
    ? (location.uri ?? location.localPath)
    : undefined
  return typeof where === 'string' ? where : undefined
}

async function readLocation(location: unknown, baseDir: string) {
  const where = locationPath(location)
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
 * Reads every filehandle of a snapshot into `data`, so the model is complete on
 * create. A relative path resolves against `baseDir`.
 */
async function inlineFilehandles(
  snapshot: Record<string, unknown>,
  baseDir: string,
) {
  const data: Record<string, string> = Object.fromEntries(
    Object.entries(isRecord(snapshot.data) ? snapshot.data : {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
  for (const [key, field] of FILEHANDLES) {
    const location = snapshot[key]
    if (location) {
      data[field] ??= await readLocation(location, baseDir)
      delete snapshot[key]
    }
  }
  return { ...snapshot, data }
}

async function readSpec(specFile: string) {
  const { expandSpec } = await import('react-msaview')
  const json = readJson(fs.readFileSync(specFile, 'utf8'), isRecord, specFile)
  const spec = json.msaview ?? json
  if (!isMsaSpec(spec)) {
    throw new Error(`${specFile} is not a spec`)
  }
  return inlineFilehandles(expandSpec(spec), path.dirname(specFile))
}

/**
 * The props an `MSAViewer` takes, as the R and Python widgets send them, read
 * into the snapshot that component would create
 */
async function readProps(propsFile: string) {
  const { viewerSnapshot } = await import('react-msaview')
  const props = readJson(
    fs.readFileSync(propsFile, 'utf8'),
    isViewerProps,
    propsFile,
  )
  const { type: _, ...snapshot } = viewerSnapshot(props)
  return {
    snapshot: await inlineFilehandles(snapshot, path.dirname(propsFile)),
    theme: props.theme,
  }
}

export async function exportSvg({
  specFile,
  propsFile,
  theme: themeName,
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
  selection,
  minimap,
  scale,
  force,
}: {
  specFile?: string
  propsFile?: string
  theme?: 'light' | 'dark'
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
  selection?: boolean
  minimap?: boolean
  scale?: number
  force?: boolean
}) {
  const outputFormat = figureFormat(outputFile)
  checkConverter(outputFormat)
  const {
    MSAModelF,
    renderToSvg,
    installHeadlessRenderEnv,
    resolveTheme,
    problemLine,
    selectionBlock,
  } = await import('react-msaview')

  enableStaticRendering(true)
  // jsdom provides document/window/SVGElement needed by svgcanvas and
  // measureTextCanvas; installHeadlessRenderEnv fills in what jsdom omits
  const JSDOM = await loadJsdom()
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const g = globalThis as Record<string, unknown>
  g.window = dom.window
  g.document = dom.window.document
  installHeadlessRenderEnv(dom.window, {}, await installNodeCanvas(g))

  const fromProps = propsFile ? await readProps(propsFile) : undefined
  const theme = resolveTheme(themeName ?? fromProps?.theme)
  const spec: Record<string, unknown> & { data?: Record<string, string> } =
    fromProps?.snapshot ?? (specFile ? await readSpec(specFile) : {})
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
  if (!data.msa && !data.tree) {
    throw new Error(
      'nothing to draw: give --msa, or a --spec or --props with an msa or a tree',
    )
  }

  const model = MSAModelF().create({
    height: 600,
    ...spec,
    // a fixed id keeps clipPath ids, and so the output bytes, stable across runs
    id: 'msaview-export',
    type: 'MsaView',
    ...(height === undefined ? {} : { height }),
    // an entire-alignment export is sized by cell size, not --width/--height;
    // cells below the letter threshold draw a long alignment as blocks
    ...(colWidth === undefined ? {} : { colWidth }),
    ...(rowHeight === undefined ? {} : { rowHeight }),
    ...(format ? { msaFormat: format } : {}),
    data,
  })
  if (colorScheme !== undefined) {
    model.setResidueColor({
      ...model.residueColor,
      scale: { scheme: colorScheme },
    })
  }
  if (treeAreaWidth !== undefined) {
    model.setTreeAreaWidth(treeAreaWidth)
  }
  model.setWidth(width)
  for (const problem of model.scaleProblems) {
    console.warn(problemLine(problem))
  }

  const block = selection ? selectionBlock(model) : undefined
  if (selection && !block) {
    throw new Error(
      '--selection draws the selected block, and the --spec or --props has no selection',
    )
  }
  const [columns, rows] = block
    ? [block.columns, block.rows]
    : [model.numColumns, model.leaves.length]
  const letters = model.showMsaLetters && !viewport ? columns * rows : 0
  if (letters > MAX_EXPORT_LETTERS && !force) {
    throw new Error(
      `the ${selection ? 'selection' : 'entire alignment'} draws ${columns} x ${rows} = ${letters} residue letters, over the limit of ${MAX_EXPORT_LETTERS}, past which the export can run out of memory. ` +
        'Draw it without letters at a smaller --col-width (e.g. 2) or --row-height (e.g. 6), draw one window of it with --viewport, or pass --force to try anyway',
    )
  }

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
    exportType: viewport ? 'viewport' : selection ? 'selection' : 'entire',
    includeMinimap: minimap,
    includeTracks:
      (!!tracks || !!specFile || !!propsFile) &&
      model.turnedOnTracks.length > 0,
  })
  writeFigure({ svg, file: outputFile, format: outputFormat, scale })
}

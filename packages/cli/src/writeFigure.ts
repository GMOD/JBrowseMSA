import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

export type FigureFormat = 'svg' | 'png' | 'pdf'

export function figureFormat(file: string): FigureFormat {
  const ext = path.extname(file).slice(1).toLowerCase()
  if (ext === 'svg' || ext === 'png' || ext === 'pdf') {
    return ext
  }
  throw new Error(
    `-o ${file}: the extension picks the format, one of .svg, .png or .pdf`,
  )
}

function rsvgConvert(args: string[], input?: string) {
  const result = spawnSync('rsvg-convert', args, {
    input,
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error) {
    throw new Error(
      'code' in result.error && result.error.code === 'ENOENT'
        ? 'rsvg-convert not found: install librsvg to write PNG or PDF (apt install librsvg2-bin, brew install librsvg)'
        : `failed to run rsvg-convert: ${result.error.message}`,
      { cause: result.error },
    )
  }
  if (result.status !== 0) {
    throw new Error(
      `rsvg-convert exited with code ${result.status}: ${result.stderr.toString().trim()}`,
    )
  }
}

/** fails before a long render when the format needs a converter that is missing */
export function checkConverter(format: FigureFormat) {
  if (format !== 'svg') {
    rsvgConvert(['--version'])
  }
}

export function writeFigure({
  svg,
  file,
  format,
  scale = 2,
}: {
  svg: string
  file: string
  format: FigureFormat
  scale?: number
}) {
  if (format === 'svg') {
    fs.writeFileSync(file, svg)
  } else {
    rsvgConvert(
      [
        '-f',
        format,
        ...(format === 'png' ? ['-z', String(scale)] : []),
        '-o',
        file,
      ],
      svg,
    )
  }
}

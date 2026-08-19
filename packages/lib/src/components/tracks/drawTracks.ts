import { columnLogoStack } from '../../sequenceLogo.ts'
import { setFontSize } from '../../setFontSize.ts'
import { visibleColRange } from '../msa/visibleColRange.ts'

import type { ColumnCounts } from '../../columnCounts.ts'
import type { MsaViewModel } from '../../model.ts'
import type { BasicTrack } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

export function drawConservationBars({
  ctx,
  values,
  color,
  colWidth,
  trackHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  values: number[]
  color: string
  colWidth: number
  trackHeight: number
  offsetX: number
  blockSize: number
}) {
  const { xStart, xEnd } = visibleColRange({
    offsetX,
    blockWidth: blockSize,
    colWidth,
  })

  ctx.fillStyle = color
  for (let i = xStart; i < xEnd && i < values.length; i++) {
    const value = values[i]!
    const barHeight = value * trackHeight
    const x = i * colWidth
    ctx.fillRect(x, trackHeight - barHeight, colWidth, barHeight)
  }
}

// the bar-track values live on model getters (kept off the plain track object so
// the live canvas autorun stays reactive); select the right one by track id
export function barTrackValues(model: MsaViewModel, trackId: string) {
  return trackId === 'property-conservation'
    ? model.propertyConservation
    : model.conservation
}

export function drawTextTrackContent({
  ctx,
  data,
  colorScheme,
  contrastScheme,
  bgColor,
  textColor,
  colWidth,
  rowHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  data: string | undefined
  colorScheme: Record<string, string>
  contrastScheme: Record<string, string>
  bgColor: boolean
  textColor: string
  colWidth: number
  rowHeight: number
  offsetX: number
  blockSize: number
}) {
  const { xStart, xEnd } = visibleColRange({
    offsetX,
    blockWidth: blockSize,
    colWidth,
  })
  const str = data?.slice(xStart, xEnd)
  const drawLetters = rowHeight >= 10 && colWidth >= rowHeight / 2

  for (let i = 0; str && i < str.length; i++) {
    const letter = str[i]!
    const upper = letter.toUpperCase()
    const color = colorScheme[upper]
    const x = (xStart + i) * colWidth
    const filled = bgColor && !!color
    if (filled) {
      ctx.fillStyle = color!
      ctx.fillRect(x, 0, colWidth, rowHeight)
    }
    if (drawLetters) {
      // a letter on a colored tile needs the tile's contrast color; otherwise it
      // sits on the plain background and takes the theme's text color
      ctx.fillStyle = filled ? (contrastScheme[upper] ?? 'black') : textColor
      ctx.fillText(letter, x + colWidth / 2, rowHeight / 2 + 1)
    }
  }
}

// Cap height as a fraction of the font size. Every logo letter is scaled from
// one reference font size to the height its frequency earns, and that scale is
// only right if we know how tall the glyph actually draws. Measuring per letter
// would be exact but `measureText` reports no vertical box in the SVG export
// backend, so the ratio is a constant: the cap height of the sans-serif faces
// both backends use, within a percent or two. It only has to be consistent --
// the same ratio for every letter is what makes the slices sum to the stack
// height instead of drifting apart.
const CAP_HEIGHT_RATIO = 0.72
// letters below this many pixels are noise, and a stack that thin reads better
// as the bar chart it approximates
const MIN_LETTER_PX = 3

export function drawSequenceLogo({
  ctx,
  colStats,
  colorScheme,
  maxBits,
  textColor,
  colWidth,
  trackHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  colStats: ColumnCounts
  colorScheme: Record<string, string>
  maxBits: number
  textColor: string
  colWidth: number
  trackHeight: number
  offsetX: number
  blockSize: number
}) {
  const { xStart, xEnd } = visibleColRange({
    offsetX,
    blockWidth: blockSize,
    colWidth,
  })
  const end = Math.min(xEnd, colStats.numColumns)

  // one reference size for every glyph; each letter's own transform takes it
  // from here to the height it earned, so the font is set once for the block
  const referenceFontSize = trackHeight
  setFontSize(ctx, referenceFontSize)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const capHeight = referenceFontSize * CAP_HEIGHT_RATIO

  for (let col = xStart; col < end; col++) {
    const stack = columnLogoStack(colStats, col, maxBits)
    if (stack.length === 0) {
      continue
    }
    const x = col * colWidth
    // stack up from the baseline: the array is ascending, so the tallest letter
    // lands on top, which is the convention that makes a logo readable at a
    // glance
    let bottom = trackHeight
    for (const { letter, bits } of stack) {
      const h = (bits / maxBits) * trackHeight
      if (h < MIN_LETTER_PX) {
        bottom -= h
        continue
      }
      const width = ctx.measureText(letter).width
      if (width === 0) {
        bottom -= h
        continue
      }
      ctx.fillStyle = colorScheme[letter] ?? textColor
      ctx.save()
      // land the glyph's baseline on the bottom of its slice, then stretch it to
      // fill the slice vertically and the column horizontally
      ctx.translate(x, bottom)
      ctx.scale(colWidth / width, h / capHeight)
      ctx.fillText(letter, 0, 0)
      ctx.restore()
      bottom -= h
    }
  }
}

/**
 * Draw one track's content into a block of the alignment's column space, at
 * `offsetY` within the ctx. Owns the transform, so both callers -- the live
 * canvas blocks and the SVG export -- draw into the same coordinate space, and
 * adding a track kind means a `kind`, a draw function above, and a case here.
 */
export function drawTrackBlock({
  model,
  ctx,
  track,
  offsetX,
  offsetY = 0,
  theme,
  contrastScheme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  track: BasicTrack
  offsetX: number
  offsetY?: number
  theme: Theme
  contrastScheme: Record<string, string>
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  const {
    blockSize,
    bgColor,
    colWidth,
    colStats,
    colorScheme: modelColorScheme,
    fontSize,
    rowHeight,
    logoMaxBits,
    highResScaleFactor,
  } = model
  const {
    id,
    kind,
    height: trackHeight,
    barColor,
    customColorScheme,
    data,
  } = track.model
  const blockSizeX = blockSizeXOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor
  const textColor = theme.palette.text.primary

  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, offsetY)

  switch (kind) {
    case 'bar': {
      drawConservationBars({
        ctx,
        values: barTrackValues(model, id),
        color: barColor ?? 'gray',
        colWidth,
        trackHeight,
        offsetX,
        blockSize: blockSizeX,
      })
      break
    }
    case 'logo': {
      drawSequenceLogo({
        ctx,
        colStats,
        colorScheme: modelColorScheme,
        maxBits: logoMaxBits,
        textColor,
        colWidth,
        trackHeight,
        offsetX,
        blockSize: blockSizeX,
      })
      break
    }
    case 'text': {
      ctx.textAlign = 'center'
      setFontSize(ctx, fontSize)
      drawTextTrackContent({
        ctx,
        data,
        colorScheme: customColorScheme ?? modelColorScheme,
        contrastScheme,
        bgColor,
        textColor,
        colWidth,
        rowHeight,
        offsetX,
        blockSize: blockSizeX,
      })
      break
    }
  }

  ctx.resetTransform()
}

/**
 * Every turned-on track stacked top to bottom, for the SVG export. The live
 * view draws the same content one canvas block at a time -- see TrackBlocks.
 */
export function renderAllTracks({
  model,
  ctx,
  offsetX,
  contrastScheme,
  theme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  offsetX: number
  contrastScheme: Record<string, string>
  theme: Theme
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  let currentY = 0
  for (const track of model.turnedOnTracks) {
    drawTrackBlock({
      model,
      ctx,
      track,
      offsetX,
      offsetY: currentY,
      theme,
      contrastScheme,
      blockSizeXOverride,
      highResScaleFactorOverride,
    })
    currentY += track.model.height
  }
}

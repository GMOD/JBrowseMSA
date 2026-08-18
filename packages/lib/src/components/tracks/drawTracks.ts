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

export function renderSequenceLogoTrack({
  model,
  ctx,
  offsetX,
  offsetY,
  trackHeight,
  theme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  offsetX: number
  offsetY: number
  trackHeight: number
  theme: Theme
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  const {
    blockSize,
    colWidth,
    colStats,
    colorScheme,
    logoMaxBits,
    highResScaleFactor,
  } = model
  const bx = blockSizeXOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor

  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, offsetY)

  drawSequenceLogo({
    ctx,
    colStats,
    colorScheme,
    maxBits: logoMaxBits,
    textColor: theme.palette.text.primary,
    colWidth,
    trackHeight,
    offsetX,
    blockSize: bx,
  })

  ctx.resetTransform()
}

export function renderConservationTrack({
  model,
  ctx,
  track,
  offsetX,
  offsetY,
  trackHeight,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  track: BasicTrack
  offsetX: number
  offsetY: number
  trackHeight: number
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { blockSize, colWidth, highResScaleFactor } = model
  const bx = blockSizeXOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor

  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, offsetY)

  drawConservationBars({
    ctx,
    values: barTrackValues(model, track.model.id),
    color: track.model.barColor ?? 'gray',
    colWidth,
    trackHeight,
    offsetX,
    blockSize: bx,
  })

  ctx.resetTransform()
}

export function renderTextTrack({
  model,
  ctx,
  track,
  offsetX,
  offsetY,
  contrastScheme,
  theme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  track: BasicTrack
  offsetX: number
  offsetY: number
  contrastScheme: Record<string, string>
  theme: Theme
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  const {
    blockSize,
    bgColor,
    colorScheme: modelColorScheme,
    colWidth,
    fontSize,
    rowHeight,
    highResScaleFactor,
  } = model

  const { customColorScheme, data } = track.model
  const colorScheme = customColorScheme ?? modelColorScheme
  const bx = blockSizeXOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor

  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, offsetY)
  ctx.textAlign = 'center'
  setFontSize(ctx, fontSize)

  drawTextTrackContent({
    ctx,
    data,
    colorScheme,
    contrastScheme,
    bgColor,
    textColor: theme.palette.text.primary,
    colWidth,
    rowHeight,
    offsetX,
    blockSize: bx,
  })

  ctx.resetTransform()
}

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
  const { turnedOnTracks } = model
  let currentY = 0

  for (const track of turnedOnTracks) {
    const trackHeight = track.model.height

    switch (track.model.kind) {
      case 'bar': {
        renderConservationTrack({
          model,
          ctx,
          track,
          offsetX,
          offsetY: currentY,
          trackHeight,
          blockSizeXOverride,
          highResScaleFactorOverride,
        })
        break
      }
      case 'logo': {
        renderSequenceLogoTrack({
          model,
          ctx,
          offsetX,
          offsetY: currentY,
          trackHeight,
          theme,
          blockSizeXOverride,
          highResScaleFactorOverride,
        })
        break
      }
      case 'text': {
        renderTextTrack({
          model,
          ctx,
          track,
          offsetX,
          offsetY: currentY,
          contrastScheme,
          theme,
          blockSizeXOverride,
          highResScaleFactorOverride,
        })
        break
      }
    }

    currentY += trackHeight
  }
}

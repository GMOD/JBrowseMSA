import { setFontSize } from '../../setFontSize.ts'
import { visibleColRange } from '../msa/visibleColRange.ts'

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

    if (track.model.barColor !== undefined) {
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
    } else {
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
    }

    currentY += trackHeight
  }
}

import type { MsaViewModel } from '../../model'
import type { BasicTrack } from '../../types'

export function renderConservationTrack({
  model,
  ctx,
  offsetX,
  offsetY,
  trackHeight,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: CanvasRenderingContext2D
  offsetX: number
  offsetY: number
  trackHeight: number
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { blockSize, colWidth, highResScaleFactor, conservation } = model
  const bx = blockSizeXOverride ?? blockSize
  const k = highResScaleFactorOverride ?? highResScaleFactor

  ctx.resetTransform()
  ctx.scale(k, k)
  ctx.translate(-offsetX, offsetY)

  const xStart = Math.max(0, Math.floor(offsetX / colWidth))
  const xEnd = Math.max(0, Math.ceil((offsetX + bx) / colWidth))

  for (let i = xStart; i < xEnd && i < conservation.length; i++) {
    const value = conservation[i]!
    const barHeight = value * trackHeight
    const x = i * colWidth

    const hue = value * 120
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
    ctx.fillRect(x, trackHeight - barHeight, colWidth, barHeight)
  }

  ctx.resetTransform()
}

export function renderTextTrack({
  model,
  ctx,
  track,
  offsetX,
  offsetY,
  contrastScheme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: CanvasRenderingContext2D
  track: BasicTrack
  offsetX: number
  offsetY: number
  contrastScheme: Record<string, string>
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
  ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`)

  const xStart = Math.max(0, Math.floor(offsetX / colWidth))
  const xEnd = Math.max(0, Math.ceil((offsetX + bx) / colWidth))
  const str = data?.slice(xStart, xEnd)

  if (str) {
    for (let i = 0; i < str.length; i++) {
      const letter = str[i]!
      const color = colorScheme[letter.toUpperCase()]
      if (bgColor) {
        const x = i * colWidth + offsetX - (offsetX % colWidth)
        ctx.fillStyle = color ?? 'white'
        ctx.fillRect(x, 0, colWidth, rowHeight)
        if (rowHeight >= 10 && colWidth >= rowHeight / 2) {
          ctx.fillStyle = contrastScheme[letter.toUpperCase()] ?? 'black'
          ctx.fillText(letter, x + colWidth / 2, rowHeight / 2 + 1)
        }
      }
    }
  }

  ctx.resetTransform()
}

export function renderAllTracks({
  model,
  ctx,
  offsetX,
  contrastScheme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: CanvasRenderingContext2D
  offsetX: number
  contrastScheme: Record<string, string>
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  const { turnedOnTracks } = model
  let currentY = 0

  for (const track of turnedOnTracks) {
    const trackHeight = track.model.height

    if (track.model.id === 'conservation') {
      renderConservationTrack({
        model,
        ctx,
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
        blockSizeXOverride,
        highResScaleFactorOverride,
      })
    }

    currentY += trackHeight
  }
}

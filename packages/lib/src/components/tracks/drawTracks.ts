import { columnLogoStack } from '../../sequenceLogo.ts'
import { setFontSize } from '../../setFontSize.ts'
import { contrastTextFn } from '../../util.ts'
import { visibleColRange } from '../msa/visibleColRange.ts'

import type { ColumnCounts } from '../../columnCounts.ts'
import type { MsaViewModel } from '../../model.ts'
import type { Arc, BasicTrack } from '../../types.ts'
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

// bar-track values are model getters, off the plain track object, so the canvas
// autorun stays reactive
export function barTrackValues(model: MsaViewModel, trackId: string) {
  const supplied = model.columnTrackContent.get(trackId)?.values
  if (supplied) {
    return supplied
  }
  return trackId === 'property-conservation'
    ? model.propertyConservation
    : model.conservation
}

// An arc's apex scales with the square root of its span. Contact-map spans skew
// short, and a linear scale flattens them along the baseline.
export function drawArcs({
  ctx,
  arcs,
  color,
  colWidth,
  trackHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  arcs: Arc[] | undefined
  color: string
  colWidth: number
  trackHeight: number
  offsetX: number
  blockSize: number
}) {
  if (!arcs?.length) {
    return
  }
  const { xStart, xEnd } = visibleColRange({
    offsetX,
    blockWidth: blockSize,
    colWidth,
  })
  let maxSpan = 1
  for (const arc of arcs) {
    maxSpan = Math.max(maxSpan, arc.end - arc.start)
  }
  // a full-height apex would put the stroke half outside the track
  const apexRoom = trackHeight - 1
  ctx.lineWidth = 1
  for (const arc of arcs) {
    // an arc that spans the block draws even though neither foot is inside it
    if (arc.end < xStart || arc.start > xEnd) {
      continue
    }
    const x1 = (arc.start + 0.5) * colWidth
    const x2 = (arc.end + 0.5) * colWidth
    const apex = apexRoom * Math.sqrt((arc.end - arc.start) / maxSpan)
    ctx.strokeStyle = arc.color ?? color
    ctx.beginPath()
    ctx.moveTo(x1, trackHeight)
    ctx.quadraticCurveTo((x1 + x2) / 2, trackHeight - 2 * apex, x2, trackHeight)
    ctx.stroke()
  }
}

export function drawTextTrackContent({
  ctx,
  data,
  colorScheme,
  contrastText,
  bgColor,
  drawLetters,
  colWidth,
  rowHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  data: string | undefined
  colorScheme: Record<string, string>
  contrastText: (color: string | undefined) => string
  bgColor: boolean
  drawLetters: boolean
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

  for (let i = 0; str && i < str.length; i++) {
    const letter = str[i]!
    const upper = letter.toUpperCase()
    const fill = bgColor ? colorScheme[upper] : undefined
    const x = (xStart + i) * colWidth
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillRect(x, 0, colWidth, rowHeight)
    }
    if (drawLetters) {
      ctx.fillStyle = contrastText(fill)
      ctx.fillText(letter, x + colWidth / 2, rowHeight / 2)
    }
  }
}

// the smallest 1/2/5 x 10^n column step that leaves room for a label
export function rulerStep(colWidth: number, minPixels = 55) {
  let step = 1
  const mantissas = [1, 2, 5]
  for (let i = 0; step * colWidth < minPixels; i++) {
    step = mantissas[i % 3]! * 10 ** Math.floor(i / 3)
  }
  return step
}

const RULER_FONT_SIZE = 10
const TICK_HEIGHT = 4

export function drawColumnRuler({
  ctx,
  numColumns,
  label,
  textColor,
  colWidth,
  trackHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  numColumns: number
  label: (col: number) => string | undefined
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
  const step = rulerStep(colWidth)
  const end = Math.min(xEnd, numColumns)
  setFontSize(ctx, RULER_FONT_SIZE)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = textColor
  ctx.strokeStyle = textColor
  ctx.lineWidth = 1

  for (let col = Math.ceil(xStart / step) * step; col < end; col += step) {
    const text = label(col)
    if (text === undefined) {
      continue
    }
    const x = (col + 0.5) * colWidth
    ctx.fillText(text, x, trackHeight - TICK_HEIGHT - 2)
    ctx.beginPath()
    ctx.moveTo(x, trackHeight - TICK_HEIGHT)
    ctx.lineTo(x, trackHeight)
    ctx.stroke()
  }
}

// Cap height as a fraction of the font size, within a percent or two for the
// sans-serif faces both backends use. `measureText` reports no vertical box in
// the SVG export backend, so one constant ratio scales every logo letter, and
// the slices sum to the stack height.
const CAP_HEIGHT_RATIO = 0.72
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

  // one reference font size for the block; each letter's transform scales it to
  // a height proportional to its frequency
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
    // the stack is ascending, so the tallest letter lands on top
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
 * `offsetY` within the ctx. Owns the transform, so the live canvas blocks and
 * the SVG export draw into the same coordinate space. A new track kind needs a
 * `kind`, a draw function above, and a case here.
 */
export function drawTrackBlock({
  model,
  ctx,
  track,
  offsetX,
  offsetY = 0,
  theme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  track: BasicTrack
  offsetX: number
  offsetY?: number
  theme: Theme
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
}) {
  // an autorun tracks every model read here, so each kind reads only what it
  // draws and a vertical zoom leaves the bar and arc canvases alone
  const { blockSize, colWidth, highResScaleFactor } = model
  const {
    id,
    kind,
    height: trackHeight,
    barColor,
    arcColor,
    arcs,
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
    case 'arc': {
      drawArcs({
        ctx,
        arcs,
        color: arcColor ?? theme.palette.text.primary,
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
        colStats: model.colStats,
        colorScheme: model.colorScheme,
        maxBits: model.alphabetMaxBits,
        textColor,
        colWidth,
        trackHeight,
        offsetX,
        blockSize: blockSizeX,
      })
      break
    }
    case 'ruler': {
      const { relativeTo, numColumns } = model
      drawColumnRuler({
        ctx,
        numColumns,
        // with relativeTo set, number by the reference row's residues
        label: relativeTo
          ? col => {
              const pos = model.visibleColToSeqPosOneBased(relativeTo, col)
              return pos === undefined ? undefined : `${pos}`
            }
          : col => `${col + 1}`,
        textColor,
        colWidth,
        trackHeight,
        offsetX,
        blockSize: blockSizeX,
      })
      break
    }
    case 'text': {
      const { bgColor, fontSize, rowHeight, showMsaLetters } = model
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      setFontSize(ctx, fontSize)
      drawTextTrackContent({
        ctx,
        data,
        colorScheme: customColorScheme ?? model.colorScheme,
        contrastText: contrastTextFn(theme),
        bgColor,
        drawLetters: showMsaLetters,
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
 * view draws the same content one canvas block at a time in TrackBlocks.
 */
export function renderAllTracks({
  model,
  ctx,
  offsetX,
  theme,
  blockSizeXOverride,
  highResScaleFactorOverride,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  offsetX: number
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
      blockSizeXOverride,
      highResScaleFactorOverride,
    })
    currentY += track.model.height
  }
}

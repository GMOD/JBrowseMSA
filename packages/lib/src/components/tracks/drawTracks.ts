import { columnLogoStack } from '../../sequenceLogo.ts'
import { setFontSize } from '../../setFontSize.ts'
import { contrastTextFn } from '../../util.ts'
import { drawFeatureSpans } from '../msa/drawFeatureSpans.ts'
import { tileColorFn } from '../msa/tileColor.ts'
import { visibleColRange } from '../msa/visibleColRange.ts'
import {
  highlightLabelFontSize,
  highlightLabelX,
  highlightLaneHeight,
  highlightMarkerHalfWidth,
  opaqueColor,
} from './highlightBands.ts'

import type { ColumnCounts } from '../../columnCounts.ts'
import type { MsaViewModel } from '../../model.ts'
import type {
  Annotation,
  Arc,
  BasicTrack,
  ColumnSpan,
  HighlightBand,
} from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

function drawConservationBars({
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
function drawArcs({
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

function drawTextTrackContent({
  ctx,
  data,
  colorAt,
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
  colorAt: (col: number, letter: string) => string | undefined
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
  const str = data?.slice(xStart, xEnd) ?? ''

  for (let i = 0; i < str.length; i++) {
    const letter = str[i]!
    const col = xStart + i
    const fill = bgColor ? colorAt(col, letter) : undefined
    const x = col * colWidth
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

// The 0-based columns in [xStart, end) to label: column 1, then each column
// whose 1-based number is a multiple of the step. A step of 2 or more puts the
// first multiple at least half a step's width past column 1, which clears the
// two labels.
export function rulerCols(xStart: number, end: number, colWidth: number) {
  const step = rulerStep(colWidth)
  const cols = step > 1 && xStart <= 0 && end > 0 ? [0] : []
  const first = Math.max(1, Math.ceil((xStart + 1) / step)) * step
  for (let n = first; n <= end; n += step) {
    cols.push(n - 1)
  }
  return cols
}

const RULER_FONT_SIZE = 10
const TICK_HEIGHT = 4

function drawColumnRuler({
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
  const end = Math.min(xEnd, numColumns)
  setFontSize(ctx, RULER_FONT_SIZE)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = textColor
  ctx.strokeStyle = textColor
  ctx.lineWidth = 1

  for (const col of rulerCols(xStart, end, colWidth)) {
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

function drawSequenceLogo({
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

// a span keeps a pixel clear above and below it, so stacked lanes read apart
const laneGap = 2
// the head of a span in an unresized lane is as long as the span is tall, and
// a taller track keeps that length
const maxHeadLength = 16

/**
 * A features track's spans, drawn with the mark the alignment overlay and a
 * `features` row panel draw: an arrow where the span carries a strand, a box
 * otherwise, labeled where the text fits. Overlapping spans divide the track's
 * height between their lanes.
 */
function drawFeatureTrack({
  ctx,
  spans,
  colors,
  labels,
  contrastText,
  colWidth,
  trackHeight,
  offsetX,
  blockSize,
}: {
  ctx: RenderCtx
  spans: ColumnSpan[]
  colors: Map<Annotation, { fill: string; stroke: string }>
  labels?: Map<Annotation, string>
  contrastText: (color: string) => string
  colWidth: number
  trackHeight: number
  offsetX: number
  blockSize: number
}) {
  ctx.lineWidth = 1
  drawFeatureSpans<ColumnSpan>({
    ctx,
    rows: spans.length > 0 ? [{ y: trackHeight, bands: spans }] : [],
    layout: {
      height: laneCount => Math.max(1, trackHeight / laneCount - laneGap),
      top: (_y, lane, h) => lane * (h + laneGap) + laneGap / 2,
      headLength: h => Math.min(h, maxHeadLength),
    },
    xOf: span => [span.startCol * colWidth, span.endCol * colWidth],
    colors,
    labelOf: span => labels?.get(span.annotation),
    contrastText,
    xMin: offsetX,
    xMax: offsetX + blockSize,
  })
}

function drawHighlightBrackets({
  ctx,
  bands,
  hovered,
  defaultColor,
  colWidth,
  offsetX,
  blockSize,
  viewLeft,
}: {
  ctx: RenderCtx
  bands: HighlightBand[]
  hovered?: string
  defaultColor: string
  colWidth: number
  offsetX: number
  blockSize: number
  viewLeft: number
}) {
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
  for (const band of bands) {
    const { key, startCol, endCol, nextStartCol, lane, label, color } = band
    const x0 = startCol * colWidth
    const reach =
      nextStartCol === undefined ? Infinity : nextStartCol * colWidth
    if (
      reach < offsetX ||
      x0 - highlightMarkerHalfWidth > offsetX + blockSize
    ) {
      continue
    }
    const isHovered = key === hovered
    const ink = color ? opaqueColor(color) : defaultColor
    const barY = (lane + 1) * highlightLaneHeight - 3
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
    ctx.lineWidth = isHovered ? 2.5 : 1.5
    ctx.beginPath()
    if (startCol === endCol) {
      const mid = x0 + colWidth / 2
      ctx.moveTo(mid - highlightMarkerHalfWidth, barY - 7)
      ctx.lineTo(mid + highlightMarkerHalfWidth, barY - 7)
      ctx.lineTo(mid, barY)
      ctx.closePath()
      ctx.fill()
    } else {
      const x1 = (endCol + 1) * colWidth
      ctx.moveTo(x0 + 0.75, barY - 6)
      ctx.lineTo(x0 + 0.75, barY)
      ctx.lineTo(x1 - 0.75, barY)
      ctx.lineTo(x1 - 0.75, barY - 6)
      ctx.stroke()
    }
    if (label) {
      setFontSize(ctx, highlightLabelFontSize, isHovered)
      const x = highlightLabelX({
        band,
        labelWidth: ctx.measureText(label).width,
        colWidth,
        viewLeft,
      })
      if (x !== undefined) {
        ctx.fillText(label, x, barY - 3)
      }
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
  viewLeft,
  hoveredHighlight,
}: {
  model: MsaViewModel
  ctx: RenderCtx
  track: BasicTrack
  offsetX: number
  offsetY?: number
  theme: Theme
  blockSizeXOverride?: number
  highResScaleFactorOverride?: number
  // the content x at the visible left edge, where a scrolled-off highlight
  // keeps its label
  viewLeft?: number
  // the highlight bracket to draw as hovered; the live strip passes the
  // pointer's, and an export none
  hoveredHighlight?: string
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
    case 'features': {
      const scale = model.featureTrackScales.get(id)
      if (scale) {
        drawFeatureTrack({
          ctx,
          spans: track.model.spans ?? [],
          colors: scale.colors,
          labels: scale.labels,
          contrastText: contrastTextFn(theme),
          colWidth,
          trackHeight,
          offsetX,
          blockSize: blockSizeX,
        })
      }
      break
    }
    case 'highlights': {
      drawHighlightBrackets({
        ctx,
        bands: track.model.bands ?? [],
        hovered: hoveredHighlight,
        defaultColor: theme.palette.text.secondary,
        colWidth,
        offsetX,
        blockSize: blockSizeX,
        viewLeft: viewLeft ?? offsetX,
      })
      break
    }
    case 'text':
    case 'reference': {
      const { bgColor, fontSize, rowHeight, showMsaLetters } = model
      const scheme = customColorScheme ?? model.colorScheme
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      setFontSize(ctx, fontSize)
      drawTextTrackContent({
        ctx,
        data,
        // the reference row takes its colors from the alignment's own
        // scheme, per column under a dynamic one
        colorAt:
          kind === 'reference'
            ? tileColorFn(model)
            : (_col, letter) => scheme[letter.toUpperCase()],
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
      viewLeft: offsetX,
    })
    currentY += track.model.height
  }
}

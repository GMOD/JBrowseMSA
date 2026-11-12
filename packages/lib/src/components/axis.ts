import { domainFraction } from '../colorRamp.ts'
import { ladderStepBelow } from './tree/scaleBar.ts'

import type { RenderCtx } from './renderCtx.ts'

/** a value scale resolved over its values: its kind and its two ends */
export interface ValueScale {
  type: 'linear' | 'log'
  domain: readonly [number, number]
}

/**
 * Where an axis sits against what it measures, d3's naming: `top` runs across
 * with its ticks and labels above the line, `left` runs down with them left
 * of it
 */
export type AxisOrientation = 'top' | 'left'

/** a tick's text from its value and the step between ticks */
export type TickFormat = (value: number, step: number) => string

export const axisFontSize = 10
const tickLength = 4
const labelGap = 2
// the room kept between two tick labels, and the spacing tried before any
// label is measured
const labelPadding = 8
const firstSpacing = 20

/** the height a `top` axis takes above its line, its labels included */
export const axisHeight = tickLength + labelGap + axisFontSize

/**
 * The pixel a value sits at along `extent`, which runs from the scale's low
 * end to its high end, clamped to the two
 */
export function valuePosition(
  scale: ValueScale,
  [start, end]: readonly [number, number],
) {
  const fraction = domainFraction(scale.domain, scale.type)
  return (value: number) => start + fraction(value) * (end - start)
}

function rounded(n: number) {
  return Number(n.toPrecision(12))
}

function linearTicks(
  [min, max]: readonly [number, number],
  length: number,
  spacing: number,
) {
  const span = max - min
  // a ladder step below 2.5 times the target lies above the target, since the
  // ladder's widest gap is 2 to 5
  const step =
    span > 0 && length > 0
      ? ladderStepBelow((2.5 * span * spacing) / length)
      : Math.abs(min) || 1
  const values: number[] = []
  for (let i = Math.ceil(min / step); i * step <= max + step * 1e-9; i++) {
    values.push(rounded(i * step))
  }
  return { values, step }
}

function logTicks(scale: ValueScale, length: number, spacing: number) {
  const [min, max] = scale.domain
  const lo = min > 0 ? min : 1
  const hi = Math.max(max, lo)
  const decades = Array.from(
    { length: Math.floor(Math.log10(hi)) - Math.ceil(Math.log10(lo)) + 1 },
    (_, i) => 10 ** (Math.ceil(Math.log10(lo)) + i),
  )
  const candidates =
    decades.length >= 2
      ? decades
      : Array.from(
          {
            length: Math.floor(Math.log10(hi)) - Math.floor(Math.log10(lo)) + 1,
          },
          (_, i) => 10 ** (Math.floor(Math.log10(lo)) + i),
        )
          .flatMap(decade => [decade, 2 * decade, 5 * decade])
          .filter(v => v >= lo && v <= hi)
  const at = valuePosition(scale, [0, length])
  const values: number[] = []
  for (const value of candidates.map(rounded)) {
    const last = values.at(-1)
    if (last === undefined || at(value) - at(last) >= spacing) {
      values.push(value)
    }
  }
  return { values, step: values[0] ?? lo }
}

/**
 * The ticks of an axis `length` pixels long, at least `spacing` pixels apart:
 * a linear scale's on the 1/2/5 x 10^n ladder the tree scale bar steps along,
 * a log scale's at each power of ten, or at 1, 2 and 5 times one where the
 * domain spans less than two of them
 */
export function axisTicks(scale: ValueScale, length: number, spacing: number) {
  return scale.type === 'log'
    ? logTicks(scale, length, spacing)
    : linearTicks(scale.domain, length, spacing)
}

function scaled(value: number, unit: number, suffix: string) {
  return value === 0 ? '0' : `${rounded(value / unit)}${suffix}`
}

/**
 * A tick label in the step's own precision, with a value of thousands or more
 * written as `k`, `M` or `G`
 */
export const valueLabel: TickFormat = (value, step) =>
  step >= 1e9
    ? scaled(value, 1e9, 'G')
    : step >= 1e6
      ? scaled(value, 1e6, 'M')
      : step >= 1e3
        ? scaled(value, 1e3, 'k')
        : value.toFixed(Math.max(0, -Math.floor(Math.log10(step))))

/** a position along a sequence, in kb or Mb once the step is that long */
export const positionLabel: TickFormat = (value, step) =>
  step >= 1e6
    ? scaled(value, 1e6, ' Mb')
    : step >= 1e3
      ? scaled(value, 1e3, ' kb')
      : `${rounded(value)}`

function clamp(x: number, lo: number, hi: number) {
  return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, x))
}

/**
 * The guide of a value scale: a line along `extent`, a tick at each value
 * `axisTicks` picks, and its label, drawn at the context's origin. `extent`
 * holds the pixels of the scale's low end and its high end along the line,
 * so a `left` axis whose values grow upward runs from its height to 0. A
 * label stays inside the extent, and the spacing grows to the widest label.
 */
export function drawAxis({
  ctx,
  scale,
  extent,
  orientation,
  color,
  format = valueLabel,
  fontSize = axisFontSize,
}: {
  ctx: RenderCtx
  scale: ValueScale
  extent: readonly [number, number]
  orientation: AxisOrientation
  color: string
  format?: TickFormat
  fontSize?: number
}) {
  const [start, end] = extent
  const length = Math.abs(end - start)
  const at = valuePosition(scale, extent)
  ctx.font = `${fontSize}px sans-serif`
  const labelsOf = ({ values, step }: { values: number[]; step: number }) =>
    values.map(value => {
      const text = format(value, scale.type === 'log' ? value : step)
      return { value, text, width: ctx.measureText(text).width }
    })
  const first = labelsOf(axisTicks(scale, length, firstSpacing))
  const room =
    orientation === 'top'
      ? Math.max(0, ...first.map(l => l.width)) + labelPadding
      : fontSize + labelPadding
  const labels =
    room > firstSpacing ? labelsOf(axisTicks(scale, length, room)) : first
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  if (orientation === 'top') {
    ctx.moveTo(start, 0)
    ctx.lineTo(end, 0)
  } else {
    ctx.moveTo(0, start)
    ctx.lineTo(0, end)
  }
  for (const { value } of labels) {
    const p = at(value)
    if (orientation === 'top') {
      ctx.moveTo(p, 0)
      ctx.lineTo(p, -tickLength)
    } else {
      ctx.moveTo(0, p)
      ctx.lineTo(-tickLength, p)
    }
  }
  ctx.stroke()

  ctx.textAlign = orientation === 'top' ? 'center' : 'right'
  ctx.textBaseline = orientation === 'top' ? 'alphabetic' : 'middle'
  const placed = labels
    .map(({ value, text, width }) => {
      const half = orientation === 'top' ? width / 2 : fontSize / 2
      return { text, half, center: clamp(at(value), lo + half, hi - half) }
    })
    .toSorted((a, b) => a.center - b.center)
  let reached = -Infinity
  for (const { text, half, center } of placed) {
    if (center - half > reached + labelPadding / 2) {
      reached = center + half
      if (orientation === 'top') {
        ctx.fillText(text, center, -tickLength - labelGap)
      } else {
        ctx.fillText(text, -tickLength - labelGap, center)
      }
    }
  }
}

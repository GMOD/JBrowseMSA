import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'

import { rampHex } from './colorRampStops.ts'

extend([namesPlugin])

/**
 * The ramps a linear, log or threshold scale's `scheme` names, after
 * jbrowse-components' packages/core/src/util/colorSchemes.ts. `viridis`,
 * `magma`, `inferno` and `cividis` are matplotlib's perceptual ramps, dark at
 * the low end; `reds` and `blues` are ColorBrewer's, from white; `redblue` and
 * `purpleorange` diverge through white, ColorBrewer's RdBu and PuOr.
 */
export const rampSchemes = Object.keys(rampHex)

/** the ramp a continuous scale samples while it names no `range` or `scheme` */
export const defaultRampScheme = 'viridis'

type Rgb = readonly [number, number, number]

function stopsFromHex(spec: string): Rgb[] {
  const out: Rgb[] = []
  for (let i = 0; i < spec.length; i += 6) {
    out.push([
      Number.parseInt(spec.slice(i, i + 2), 16),
      Number.parseInt(spec.slice(i + 2, i + 4), 16),
      Number.parseInt(spec.slice(i + 4, i + 6), 16),
    ])
  }
  return out
}

const schemeStops = new Map(
  Object.entries(rampHex).map(([name, spec]) => [name, stopsFromHex(spec)]),
)

export function isRampScheme(name: string) {
  return schemeStops.has(name)
}

function rgbOf(color: string): Rgb {
  const { r, g, b } = colord(color).toRgb()
  return [r, g, b]
}

/** A continuous scale's ramp as a record declares it. */
export interface RampDeclaration {
  range?: readonly string[]
  scheme?: string
  reverse?: boolean
}

/**
 * The stops a continuous scale samples: `range`'s colors where it lists two
 * or more, else the named `scheme`, viridis while that is unset or unknown,
 * turned round under `reverse`. From jbrowse-components'
 * packages/core/src/util/colorRamp.ts.
 */
export function rampStops({ range, scheme, reverse }: RampDeclaration) {
  const stops =
    range && range.length > 1
      ? range.map(rgbOf)
      : (schemeStops.get(scheme ?? defaultRampScheme) ??
        schemeStops.get(defaultRampScheme)!)
  return reverse ? stops.toReversed() : stops
}

function hex2(n: number) {
  return Math.round(n).toString(16).padStart(2, '0')
}

/**
 * The color at `t` in [0, 1] across evenly spaced stops, linearly
 * interpolated per channel and clamped at the ends
 */
export function sampleRamp(stops: readonly Rgb[], t: number) {
  const position = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const lower = Math.floor(position)
  const lo = stops[lower]!
  const hi = stops[Math.min(lower + 1, stops.length - 1)]!
  const frac = position - lower
  return `#${[0, 1, 2].map(i => hex2(lo[i]! * (1 - frac) + hi[i]! * frac)).join('')}`
}

/**
 * Where a value at fraction `t` of the domain samples the ramp when the
 * ramp's middle stop sits at fraction `mid`: each side keeps the slope of the
 * longer one, so the middle color marks `domainMid` and the shorter side
 * stops short of its end color. jbrowse-components' `rampMidT`, from
 * packages/render-core/src/shaders/colorRampLut.slang.
 */
export function rampMidT(t: number, mid: number) {
  const half = Math.max(mid, 1 - mid)
  return Math.max(0, Math.min(1, (t + (half - mid)) / (2 * half)))
}

/**
 * The domain a continuous scale spans: each end `min` or `max` pins, else the
 * extent's, ascending. An open end stops at a pinned one, and an extent
 * holding no value spans [0, 1]. From jbrowse-components'
 * packages/core/src/util/colorRamp.ts.
 */
export function rampDomain(
  min: number | undefined,
  max: number | undefined,
  extent: readonly [number, number],
): [number, number] {
  const [lo, hi] = extent[0] <= extent[1] ? extent : [0, 1]
  return min !== undefined && max !== undefined
    ? min <= max
      ? [min, max]
      : [max, min]
    : min !== undefined
      ? [min, Math.max(min, hi)]
      : max !== undefined
        ? [Math.min(lo, max), max]
        : [lo, hi]
}

/**
 * The fraction of the domain a value sits at, clamped to [0, 1]. A log scale
 * floors its low end at 1 where that end is not positive. From
 * jbrowse-components' packages/render-core/src/scoreScale.ts.
 */
export function domainFraction(
  [min, max]: readonly [number, number],
  type: 'linear' | 'log',
) {
  const floor = min > 0 ? min : 1
  const lo = type === 'log' ? Math.log(floor) : min
  const span = (type === 'log' ? Math.log(Math.max(max, floor)) : max) - lo
  return (value: number) => {
    const v = type === 'log' ? Math.log(Math.max(value, floor)) : value
    const t = span > 0 ? (v - lo) / span : v > lo ? 1 : 0
    return t > 1 ? 1 : t > 0 ? t : 0
  }
}

/**
 * The nearest-rank `quantile` of ascending `sorted`: the smallest value at
 * least that share of them sit at or below
 */
function highRank(sorted: readonly number[], quantile: number) {
  const n = sorted.length
  return sorted[Math.min(n - 1, Math.max(0, Math.ceil(quantile * n) - 1))]!
}

function lowRank(sorted: readonly number[], quantile: number) {
  const n = sorted.length
  return sorted[Math.max(0, Math.min(n - 1, n - Math.ceil(quantile * n)))]!
}

/**
 * What the open ends of a scale follow: at a `quantile` of 1 the finite
 * extremes, and below it each end clipped at the nearest-rank quantile of the
 * values on its side of 0, so one outlier takes neither end. Under 0.5 reads
 * as 0.5. `[Infinity, -Infinity]` where no value is finite. From
 * jbrowse-components' packages/core/src/util/quantileExtent.ts.
 */
export function quantileExtent(
  values: readonly number[],
  quantile = 1,
): [number, number] {
  const finite = values.filter(v => Number.isFinite(v))
  return finite.length === 0
    ? [Infinity, -Infinity]
    : quantile < 1
      ? clippedExtent(finite, Math.max(0.5, quantile))
      : finite.reduce<[number, number]>(
          ([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)],
          [Infinity, -Infinity],
        )
}

function ascending(a: number, b: number) {
  return a - b
}

function clippedExtent(finite: number[], q: number): [number, number] {
  const positive = finite.filter(v => v >= 0).toSorted(ascending)
  const negative = finite.filter(v => v < 0).toSorted(ascending)
  const low = negative.length > 0 ? lowRank(negative, q) : lowRank(positive, q)
  const high =
    positive.length > 0 ? highRank(positive, q) : highRank(negative, q)
  return [Math.min(low, high), high]
}

/**
 * A domain end as a legend prints it, jbrowse-components' `formatScore`
 * (packages/core/src/util/numericUtils.ts)
 */
export function formatEnd(n: number) {
  if (n === 0) {
    return '0'
  }
  if (Math.abs(n) >= 100) {
    return n.toFixed(0)
  }
  const s = n.toPrecision(3)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

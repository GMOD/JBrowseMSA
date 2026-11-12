import { quantileExtent, rampDomain } from './colorRamp.ts'
import { valueLabel } from './components/axis.ts'

import type { ValueScale } from './components/axis.ts'
import type { PanelAxis, ValueScaleSpec } from './types.ts'

/** the diameter of a `point` panel's dot where the record names none */
export const defaultPointSize = 6

// a pixel kept clear of the panel's edges, so a bar's end or a dot's rim
// stays inside its clip
const edgePadding = 1

/** each row's value of `field` where it parses as a finite number */
export function rowNumbers(
  rowData: Record<string, Record<string, string> | undefined>,
  field: string,
) {
  const values = new Map<string, number>()
  for (const [name, row] of Object.entries(rowData)) {
    const text = row?.[field]
    const n = text === undefined || text.trim() === '' ? NaN : Number(text)
    if (Number.isFinite(n)) {
      values.set(name, n)
    }
  }
  return values
}

/** the rows whose value of `field` is one of `values` */
export function rowsHolding(
  rowData: Record<string, Record<string, string> | undefined>,
  field: string,
  values: ReadonlySet<string> | undefined,
) {
  const rows = new Set<string>()
  if (values) {
    for (const [name, row] of Object.entries(rowData)) {
      const value = row?.[field]
      if (value !== undefined && values.has(value)) {
        rows.add(name)
      }
    }
  }
  return rows
}

/** each row's value of `field`, for the rows holding one */
export function rowTexts(
  rowData: Record<string, Record<string, string> | undefined>,
  field: string,
) {
  const texts = new Map<string, string>()
  for (const [name, row] of Object.entries(rowData)) {
    const text = row?.[field]
    if (text !== undefined) {
      texts.set(name, text)
    }
  }
  return texts
}

/**
 * A value scale over `values`: each end `domainMin` or `domainMax` pins, else
 * the values' extent clipped at `domainQuantile`, the way a ramp's ends
 * follow its values. A log scale reads only the positive values. `zero` takes
 * 0 into a linear scale's open ends, so a bar starts at 0.
 */
export function resolveValueScale(
  spec: ValueScaleSpec | undefined,
  values: Iterable<number>,
  zero: boolean,
): ValueScale {
  const type = spec?.type === 'log' ? 'log' : 'linear'
  const all = [...values]
  const [lo, hi] = quantileExtent(
    type === 'log' ? all.filter(v => v > 0) : all,
    spec?.domainQuantile,
  )
  const withZero = zero && type === 'linear'
  const extent: [number, number] =
    lo <= hi && withZero ? [Math.min(lo, 0), Math.max(hi, 0)] : [lo, hi]
  return {
    type,
    domain: rampDomain(spec?.domainMin, spec?.domainMax, extent),
  }
}

/**
 * The axis of a bar or point panel `width` pixels wide: its scale's ends a
 * pixel in from the edges, and in from a dot's radius
 */
export function valuePanelAxis(
  kind: 'bar' | 'point',
  scale: ValueScale,
  width: number,
  size: number,
): PanelAxis {
  const inset = edgePadding + (kind === 'point' ? size / 2 : 0)
  return {
    scale,
    extent: [inset, Math.max(inset, width - inset)],
    format: valueLabel,
  }
}

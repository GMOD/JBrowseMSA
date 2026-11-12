import {
  domainFraction,
  formatEnd,
  quantileExtent,
  rampDomain,
  rampMidT,
  rampStops,
  sampleRamp,
} from './colorRamp.ts'
import { createPaletteMap } from './createPaletteMap.ts'
import { paletteNamed } from './ggplotPalettes.ts'
import { compareGroupKeys } from './groupKeys.ts'

import type { LegendItem } from './legendSpec.ts'
import type { Annotation, ColorScheme } from './types.ts'

export type ScaleType = 'ordinal' | 'linear' | 'log' | 'threshold' | 'identity'

/**
 * How a channel turns a field's values into colors, spelt as Vega-Lite and
 * jbrowse-components' displays spell a scale (jbrowse-components' ADR-238 and
 * ADR-240).
 *
 * - `type`: `ordinal` (the default) hands each distinct value a color,
 *   `linear` and `log` sample a ramp between the domain's ends, `threshold`
 *   cuts the number line at the values `domain` lists, and `identity` paints
 *   each value as the CSS color it is (jbrowse-components' ADR-243)
 * - `domain`: an ordinal scale's values in legend order, each taking the
 *   `range` color at its own index, with the field's other values following
 *   in natural order; a threshold scale's cuts; the colors an identity
 *   scale's legend lists
 * - `range`: a list of colors: one per value, the stops of a ramp, or one per
 *   threshold interval
 * - `scheme`: a palette (`ggplot`, `set1`, `dark2`, `okabeito`, `tableau`) for
 *   an ordinal scale, a ramp (`viridis`, the default, `magma`, `inferno`,
 *   `cividis`, `reds`, `blues`, `redblue`, `purpleorange`) for the others;
 *   read where `range` is unset
 * - `domainMin`, `domainMax`: a ramp's ends, each following the values where
 *   unset
 * - `domainMid`: the value a ramp's middle color marks
 * - `domainQuantile`: the nearest-rank quantile an open end follows, from 0.5
 *   to 1 (the default, the extremes)
 * - `reverse`: turns the ramp round
 */
export interface ColorScale {
  type?: ScaleType
  domain?: (string | number)[]
  range?: string[]
  scheme?: string
  domainMin?: number
  domainMax?: number
  domainMid?: number
  domainQuantile?: number
  reverse?: boolean
}

/**
 * The guide a color scale draws. `title` is the field when unset. `labels`
 * names an ordinal or identity scale's `domain` values or a threshold scale's
 * intervals in order, and `missingLabel` names the grey row a record with no value, or one
 * that is no number, draws under.
 */
export interface ColorLegend {
  title?: string
  labels?: string[]
  missingLabel?: string
}

/**
 * The color object: a channel's `scale` and its `legend`. Records declaring
 * the same scale and legend share one scale.
 */
export interface ColorSpec {
  scale?: ColorScale
  legend?: ColorLegend
}

/** a channel record: a field read through a color object */
export interface ColorChannel extends ColorSpec {
  field: string
}

/**
 * A scale resolved over a field's values. `colorOf` takes the string the
 * field holds, or undefined where the record has none, and `items` are the
 * scale's legend rows. `note` is a line about the scale for its legend.
 */
export interface ResolvedScale {
  kind: ScaleType
  colorOf: (value: string | undefined) => string | undefined
  items: LegendItem[]
  note?: string
}

/** the grey a value with no number, or a record with no value, draws in */
export const missingColor = '#d9d9d9'

/** the legend row values that are no number list under by default */
export const notANumberLabel = 'not a number'

/** the stops a ramp's legend bar draws */
const gradientStops = 11

export function scaleKind(scale: ColorScale | undefined): ScaleType {
  const type = scale?.type
  return type === 'linear' ||
    type === 'log' ||
    type === 'threshold' ||
    type === 'identity'
    ? type
    : 'ordinal'
}

/** whether each of a scale's legend rows keys one value, which a click hides */
export function isCategorical(kind: ScaleType) {
  return kind === 'ordinal' || kind === 'identity'
}

function isNumeric(value: string) {
  return value.trim() !== '' && Number.isFinite(Number(value))
}

function scaleColors(scale: ColorScale | undefined, order: string[]) {
  const list = scale?.range
  return list
    ? new Map(order.slice(0, list.length).map((value, i) => [value, list[i]!]))
    : new Map(
        Object.entries(createPaletteMap(order, paletteNamed(scale?.scheme))),
      )
}

/**
 * What the values of a continuous scale's field hold: the numbers, and
 * whether a record had no value or one that is no number
 */
function readNumbers(values: Iterable<string | undefined>) {
  const numbers: number[] = []
  let absent = false
  let notANumber = false
  for (const value of values) {
    if (value === undefined || value.trim() === '') {
      absent = true
    } else {
      const n = Number(value)
      if (Number.isNaN(n)) {
        notANumber = true
      } else {
        numbers.push(n)
      }
    }
  }
  return { numbers, absent, notANumber }
}

function parsed(value: string | undefined) {
  return value === undefined || value.trim() === '' ? undefined : Number(value)
}

/**
 * The grey row a continuous scale's legend ends with: values that are no
 * number always list, and records with no value list once `missingLabel`
 * names them
 */
function gapItems(
  legend: ColorLegend | undefined,
  met: { absent: boolean; notANumber: boolean },
): LegendItem[] {
  const label = legend?.missingLabel
  return met.notANumber || (label !== undefined && met.absent)
    ? [{ value: '', label: label ?? notANumberLabel, color: missingColor }]
    : []
}

function continuousColor(
  legend: ColorLegend | undefined,
  colorAt: (n: number) => string,
) {
  const absentColor =
    legend?.missingLabel === undefined ? undefined : missingColor
  return (value: string | undefined) => {
    const n = parsed(value)
    return n === undefined
      ? absentColor
      : Number.isNaN(n)
        ? missingColor
        : colorAt(n)
  }
}

function resolveOrdinal(
  scale: ColorScale | undefined,
  legend: ColorLegend | undefined,
  values: Iterable<string | undefined>,
): ResolvedScale {
  const present = new Set<string>()
  let absent = false
  for (const value of values) {
    if (value === undefined) {
      absent = true
    } else {
      present.add(value)
    }
  }
  const declared = (scale?.domain ?? []).map(String)
  const listed = new Set(declared)
  const order = [
    ...listed,
    ...[...present].filter(v => !listed.has(v)).toSorted(compareGroupKeys),
  ]
  const colors = scaleColors(scale, order)
  const names = new Map(
    declared.flatMap((value, i) => {
      const label = legend?.labels?.[i]
      return label === undefined ? [] : [[value, label] as const]
    }),
  )
  const missing = legend?.missingLabel
  const numeric = present.size > 0 && [...present].every(isNumeric)
  return {
    kind: 'ordinal',
    colorOf: value =>
      value === undefined
        ? missing === undefined
          ? undefined
          : missingColor
        : colors.get(value),
    items: [
      ...order
        .filter(value => present.has(value) && colors.has(value))
        .map(value => ({
          value,
          label: names.get(value) ?? value,
          color: colors.get(value)!,
        })),
      ...(missing !== undefined && absent
        ? [{ value: '', label: missing, color: missingColor }]
        : []),
    ],
    note:
      numeric && scale?.type === undefined
        ? 'every value is a number: scale: {type: "linear"} draws them on a ramp'
        : undefined,
  }
}

/**
 * A value as the CSS color it names. `255,0,0` reads as `rgb(255,0,0)`, as a
 * GFF `color=` attribute does in msa-parsers' gffToAnnotations.ts.
 */
export function cssColorOf(value: string) {
  const triple = /^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/.exec(value.trim())
  return triple ? `rgb(${triple[1]},${triple[2]},${triple[3]})` : value.trim()
}

/**
 * Each value is its own color. The legend lists the colors `domain` names
 * that the values hold, under `labels`, and with no `domain` it lists none,
 * jbrowse-components' ADR-243 as its ADR-265 amends it. A row keys its color
 * as `cssColorOf` writes it, the form a GFF `color=` takes once parsed.
 */
function resolveIdentity(
  scale: ColorScale | undefined,
  legend: ColorLegend | undefined,
  values: Iterable<string | undefined>,
): ResolvedScale {
  const present = new Set<string>()
  let absent = false
  for (const value of values) {
    if (value === undefined || value.trim() === '') {
      absent = true
    } else {
      present.add(cssColorOf(value))
    }
  }
  const missing = legend?.missingLabel
  return {
    kind: 'identity',
    colorOf: value =>
      value === undefined || value.trim() === ''
        ? missing === undefined
          ? undefined
          : missingColor
        : cssColorOf(value),
    items: [
      ...(scale?.domain ?? []).flatMap((entry, i) => {
        const color = cssColorOf(String(entry))
        return present.has(color)
          ? [
              {
                value: color,
                label: legend?.labels?.[i] ?? String(entry),
                color,
              },
            ]
          : []
      }),
      ...(missing !== undefined && absent
        ? [{ value: '', label: missing, color: missingColor }]
        : []),
    ],
  }
}

function resolveRamp(
  type: 'linear' | 'log',
  scale: ColorScale | undefined,
  legend: ColorLegend | undefined,
  values: Iterable<string | undefined>,
): ResolvedScale {
  const met = readNumbers(values)
  const usable = type === 'log' ? met.numbers.filter(n => n > 0) : met.numbers
  const domain = rampDomain(
    scale?.domainMin,
    scale?.domainMax,
    quantileExtent(usable, scale?.domainQuantile),
  )
  const fraction = domainFraction(domain, type)
  const stops = rampStops(scale ?? {})
  const mid = scale?.domainMid === undefined ? 0.5 : fraction(scale.domainMid)
  const colorAtT = (t: number) => sampleRamp(stops, rampMidT(t, mid))
  const [lo, hi] = quantileExtent(usable)
  const gradient = {
    stops: Array.from({ length: gradientStops }, (_, i) => {
      const offset = i / (gradientStops - 1)
      return { offset, color: colorAtT(offset) }
    }),
    minLabel: `${lo < domain[0] ? '≤' : ''}${formatEnd(domain[0])}`,
    maxLabel: `${hi > domain[1] ? '≥' : ''}${formatEnd(domain[1])}`,
  }
  return {
    kind: type,
    colorOf: continuousColor(legend, n => colorAtT(fraction(n))),
    items: [
      ...(met.numbers.length > 0 ? [{ label: '', gradient }] : []),
      ...gapItems(legend, met),
    ],
  }
}

/**
 * A threshold scale's cuts as it reads them: the numbers its domain names,
 * ascending. From jbrowse-components'
 * packages/core/src/util/thresholdScale.ts.
 */
export function thresholdCuts(domain: readonly (string | number)[]) {
  return domain
    .map(Number)
    .filter(cut => Number.isFinite(cut))
    .toSorted((a, b) => a - b)
}

/**
 * What a threshold scale's intervals are called in a legend: `< a` below the
 * first cut, `a – b` between two, `≥ b` past the last
 */
export function thresholdLabels(cuts: readonly number[]) {
  return cuts.length === 0
    ? ['any value']
    : [
        `< ${cuts[0]}`,
        ...cuts.slice(1).map((cut, i) => `${cuts[i]} – ${cut}`),
        `≥ ${cuts.at(-1)}`,
      ]
}

function resolveThreshold(
  scale: ColorScale | undefined,
  legend: ColorLegend | undefined,
  values: Iterable<string | undefined>,
): ResolvedScale {
  const met = readNumbers(values)
  const cuts = thresholdCuts(scale?.domain ?? [])
  const bins = cuts.length + 1
  const ramp = rampStops({ scheme: scale?.scheme, reverse: scale?.reverse })
  const palette = Array.from(
    { length: bins },
    (_, i) =>
      scale?.range?.[i] ?? sampleRamp(ramp, bins === 1 ? 0 : i / (bins - 1)),
  )
  const labels = thresholdLabels(cuts)
  return {
    kind: 'threshold',
    colorOf: continuousColor(legend, n => {
      const bin = cuts.findIndex(cut => n < cut)
      return palette[bin === -1 ? cuts.length : bin]!
    }),
    items: [
      ...(met.numbers.length > 0
        ? labels.map((label, i) => ({
            value: label,
            label: legend?.labels?.[i] ?? label,
            color: palette[i]!,
          }))
        : []),
      ...gapItems(legend, met),
    ],
  }
}

/**
 * The scale a channel reads its field through. `values` are the field's
 * values, in any order and with repeats, undefined for a record with none.
 *
 * An ordinal scale's domain lists the values `domain` names first, then the
 * rest in natural order, so a value keeps its color when rows are re-ordered,
 * collapsed or filtered. A `scheme`, or no `range` at all, colors every value:
 * past the end of the palette each takes an evenly spaced hue. A `range`
 * leaves the values past its end uncolored, so `{domain, range}` colors the
 * values it names and no others.
 *
 * A linear or log scale parses each value and samples its ramp between the
 * domain's ends, each pinned by `domainMin` or `domainMax` or else following
 * the values, clipped at `domainQuantile`. A value past an end draws in the end
 * color, and the legend marks that end `≤` or `≥`. A threshold scale colors
 * each interval its cuts make, and its legend lists every interval. An
 * identity scale paints each value as the color it names.
 */
export function resolveScale(
  scale: ColorScale | undefined,
  values: Iterable<string | undefined>,
  legend?: ColorLegend,
): ResolvedScale {
  const kind = scaleKind(scale)
  return kind === 'ordinal'
    ? resolveOrdinal(scale, legend, values)
    : kind === 'identity'
      ? resolveIdentity(scale, legend, values)
      : kind === 'threshold'
        ? resolveThreshold(scale, legend, values)
        : resolveRamp(kind, scale, legend, values)
}

/**
 * which table a record's field is read from: `rowData`, the features, or the
 * tree's internal nodes, whose one field is `support`
 */
export type ScaleTable = 'rows' | 'features' | 'nodes'

/**
 * One record's use of a color object: the values its field takes in its
 * table, and for the feature table the values the drawn features carry, which
 * the legend lists
 */
export interface ScaleUse {
  spec: ColorSpec
  field: string
  table: ScaleTable
  values: (string | undefined)[]
  shown?: (string | undefined)[]
}

/**
 * A record that reads a field through a color object, with where it sits in
 * the snapshot (`encodings[0]`, `rowPanels[2].encoding.fill`)
 */
export interface ColorRecord {
  record: string
  channel: ColorChannel
  table: ScaleTable
  /** the spans a features column track carries in place of the feature table */
  annotations?: Annotation[]
}

export interface SharedScale extends ResolvedScale {
  key: string
  title: string
}

/** whether a linear or log scale follows its own values at an end, or neither */
function rampEnds(scale: ColorScale | undefined) {
  const kind = scaleKind(scale)
  return kind === 'linear' || kind === 'log'
    ? scale?.domainMin === undefined || scale.domainMax === undefined
      ? 'open'
      : 'pinned'
    : undefined
}

/**
 * The key records share a scale under: the table, the scale and the legend as
 * declared, with the legend's title standing in for the field. Two strips over
 * one scheme with no title read two fields and list two legends; naming one
 * title gives them one scale and one legend. A ramp pinned at both ends is its
 * declaration whatever the field, and a ramp with an open end follows its own
 * field's values, so its field joins the key.
 */
export function declarationKey({
  spec,
  field,
  table,
}: Pick<ScaleUse, 'spec' | 'field' | 'table'>) {
  const { scale, legend } = spec
  const ends = rampEnds(scale)
  const title = legend?.title ?? (ends === 'pinned' ? undefined : field)
  return JSON.stringify([
    table,
    scale?.type ?? 'ordinal',
    scale?.domain,
    scale?.range,
    scale?.scheme,
    scale?.domainMin,
    scale?.domainMax,
    scale?.domainMid,
    scale?.domainQuantile,
    scale?.reverse,
    legend?.labels,
    legend?.missingLabel,
    title,
    ends === 'open' ? field : undefined,
  ])
}

/**
 * Resolves each declaration once over the union of its records' values, so a
 * value two fields share takes one color in both
 */
export function resolveShared(uses: ScaleUse[]) {
  const groups = new Map<string, ScaleUse[]>()
  for (const use of uses) {
    const key = declarationKey(use)
    groups.set(key, [...(groups.get(key) ?? []), use])
  }
  return new Map(
    [...groups].map(([key, group]) => {
      const { spec, field } = group[0]!
      const resolved = resolveScale(
        spec.scale,
        group.flatMap(u => u.values),
        spec.legend,
      )
      const shown =
        group[0]!.shown && isCategorical(resolved.kind)
          ? new Set(group.flatMap(u => u.shown ?? []))
          : undefined
      const scale: SharedScale = {
        ...resolved,
        key,
        title: spec.legend?.title ?? field,
        items: shown
          ? resolved.items.filter(
              item => item.value === '' || shown.has(item.value),
            )
          : resolved.items,
      }
      return [key, scale] as const
    }),
  )
}

/**
 * The color a scale gives each value listed, for a reader that keys colors by
 * value, such as the residue letters of a scheme or a text track
 */
export function colorTable(
  scale: ColorScale | undefined,
  values: Iterable<string>,
) {
  const list = [...values]
  const { colorOf } = resolveScale(scale, list)
  return Object.fromEntries(
    list.flatMap(value => {
      const color = colorOf(value)
      return color === undefined ? [] : [[value, color] as const]
    }),
  )
}

/** the letter-to-color table an object `colorScheme`, a scale, gives */
export function letterColors(scheme: Exclude<ColorScheme, string>) {
  return colorTable(scheme, scheme.domain ?? [])
}

import { colord } from 'colord'

import { createPaletteMap } from './createPaletteMap.ts'
import { paletteNamed } from './ggplotPalettes.ts'
import { compareGroupKeys } from './groupKeys.ts'

import type {
  ColorEncoding,
  ColorScheme,
  ColumnTrackSpec,
  Encoding,
  FieldChannel,
  LabelEncoding,
  LegendEntry,
  RowFeaturesSpec,
  RowPanelSpec,
  RowStripSpec,
} from './types.ts'

/**
 * How a channel turns a field's values into colors, spelt as Vega-Lite and
 * jbrowse-components' displays spell a scale (jbrowse-components' ADR-238 and
 * ADR-240).
 *
 * - `type`: `ordinal`, the only type so far
 * - `domain`: values in legend order, each taking the `range` color at its own
 *   index; the field's other values follow in natural order
 * - `range`: a list of colors, which colors as many values as it holds
 * - `scheme`: a palette (`ggplot`, `set1`, `dark2`, `okabeito`, `tableau`)
 *   that colors every value, read where `range` is unset
 */
export interface ColorScale {
  type?: 'ordinal'
  domain?: string[]
  range?: string[]
  scheme?: string
}

/** the guide a color scale draws: `title` is the field when unset */
export interface LegendSpec {
  title?: string
}

/**
 * The color object: a channel's `scale` and its `legend`. Records declaring
 * the same scale and legend title over one table share one scale.
 */
export interface ColorSpec {
  scale?: ColorScale
  legend?: LegendSpec
}

/** a channel record: a field read through a color object */
export interface ColorChannel extends ColorSpec {
  field: string
}

export interface ResolvedScale {
  kind: 'categorical'
  colorOf: (value: string) => string | undefined
  legend: LegendEntry[]
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
 * The scale a channel reads its field through. `values` are the field's
 * values, in any order and with repeats. The domain lists the values `domain`
 * names first, then the rest in natural order, so a value keeps its color when
 * rows are re-ordered, collapsed or filtered.
 *
 * A `scheme`, or no `range` at all, colors every value: past the end of the
 * palette each takes an evenly spaced hue. A `range` leaves the values past its
 * end uncolored, so `{domain, range}` colors the values it names and no others.
 */
export function resolveScale(
  scale: ColorScale | undefined,
  values: Iterable<string>,
): ResolvedScale {
  const present = new Set(values)
  const listed = new Set(scale?.domain)
  const order = [
    ...listed,
    ...[...present].filter(v => !listed.has(v)).sort(compareGroupKeys),
  ]
  const colors = scaleColors(scale, order)
  return {
    kind: 'categorical',
    colorOf: (value: string) => colors.get(value),
    legend: order
      .filter(value => present.has(value) && colors.has(value))
      .map(value => ({ id: value, label: value, color: colors.get(value)! })),
  }
}

/** which table a record's field is read from */
export type ScaleTable = 'rows' | 'features'

/**
 * One record's use of a color object: the values its field takes in its
 * table, and for the feature table the values the drawn features carry, which
 * the legend lists
 */
export interface ScaleUse {
  spec: ColorSpec
  field: string
  table: ScaleTable
  values: string[]
  shown?: string[]
}

export interface SharedScale extends ResolvedScale {
  key: string
  title: string
}

/**
 * The key records share a scale under: the table, the scale as declared and
 * the legend's title, which stands in for the field. Two strips over one
 * scheme with no title read two fields and list two legends; naming one title
 * gives them one scale and one legend.
 */
export function declarationKey({
  spec,
  field,
  table,
}: Pick<ScaleUse, 'spec' | 'field' | 'table'>) {
  const { type = 'ordinal', domain, range, scheme } = spec.scale ?? {}
  const title = spec.legend?.title ?? field
  return JSON.stringify([table, type, domain, range, scheme, title])
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
      )
      const shown = group[0]!.shown
        ? new Set(group.flatMap(u => u.shown ?? []))
        : undefined
      const scale: SharedScale = {
        ...resolved,
        key,
        title: spec.legend?.title ?? field,
        legend: shown
          ? resolved.legend.filter(entry => shown.has(entry.id))
          : resolved.legend,
      }
      return [key, scale] as const
    }),
  )
}

/**
 * A scale object in any spelling it has had: today's, and the `{palette}` or
 * `{map}` written before jbrowse-components' ADR-151
 */
export interface LegacyScale extends ColorScale {
  palette?: string
  map?: Record<string, string>
}

/**
 * The color members a record has carried: today's nested `scale` and `legend`,
 * ADR-151's flat `scale` kind, `domain`, `range` (a list, a palette name or a
 * comma-separated string of colors) and `title`, and a strip's earlier
 * `legend` string
 */
export interface LegacyColorMembers {
  scale?: 'categorical' | LegacyScale
  domain?: string[]
  range?: string | string[]
  title?: string
  legend?: string | LegendSpec
}

/** a record as an older snapshot, R or Python may write it */
export type LegacyColor<T extends ColorSpec> = Omit<T, keyof ColorSpec> &
  LegacyColorMembers

function flatRange(range: LegacyColorMembers['range']): ColorScale {
  const colors =
    typeof range === 'string' && !paletteNamed(range)
      ? range.split(/,(?![^(]*\))/).map(c => c.trim())
      : undefined
  return range === undefined
    ? {}
    : typeof range !== 'string'
      ? { range }
      : colors?.every(c => colord(c).isValid())
        ? { range: colors }
        : { scheme: range }
}

function liftScale({
  scale,
  domain,
  range,
}: LegacyColorMembers): ColorScale | undefined {
  const { palette, map, ...current } = typeof scale === 'object' ? scale : {}
  const lifted: ColorScale = {
    ...(domain ? { domain } : {}),
    ...flatRange(range),
    ...(palette === undefined ? {} : { scheme: palette }),
    ...(map ? { domain: Object.keys(map), range: Object.values(map) } : {}),
    ...current,
  }
  return Object.keys(lifted).length > 0 ? lifted : undefined
}

function liftLegend({
  title,
  legend,
}: LegacyColorMembers): LegendSpec | undefined {
  const flat = typeof legend === 'string' ? legend : title
  return typeof legend === 'object'
    ? legend
    : flat === undefined
      ? undefined
      : { title: flat }
}

/**
 * Lifts every earlier spelling onto the color object: flat `domain` and
 * `range` into `scale`, a palette name in `range` or `{palette}` into
 * `scale.scheme`, `{map}` into `scale.domain` and `scale.range`, and `title` or
 * a `legend` string into `legend.title`. A member written in today's spelling
 * wins.
 */
export function readColor<T extends LegacyColorMembers>(record: T) {
  const { scale, domain, range, title, legend, ...rest } = record
  const lifted = liftScale(record)
  const guide = liftLegend(record)
  return {
    ...rest,
    ...(lifted ? { scale: lifted } : {}),
    ...(guide ? { legend: guide } : {}),
  }
}

/** a channel written as a bare field name, jbrowse-components' shorthand */
function readChannel(channel: LegacyColor<ColorChannel> | string) {
  return typeof channel === 'string' ? { field: channel } : readColor(channel)
}

export type LegacyEncoding = LegacyColor<ColorEncoding> | LabelEncoding

export function readEncoding(encoding: LegacyEncoding): Encoding {
  return encoding.channel === 'featureLabel' ? encoding : readColor(encoding)
}

/**
 * A strip in any spelling it has had: `encoding.fill` as a color object in
 * any spelling or a bare field name, or the color members on the record
 * itself, which a missing `encoding.fill` falls back to
 */
export type LegacyStrip = Omit<RowStripSpec, 'encoding'> &
  LegacyColorMembers & {
    field?: string
    encoding?: { fill?: LegacyColor<ColorChannel> | string } | null
  }

/**
 * A features panel's channels in any spelling they have had: `color` for the
 * span's `fill`, `label` for its `text`, and either as a bare field name
 */
export interface LegacyFeatureEncoding {
  fill?: LegacyColor<ColorChannel> | string
  color?: LegacyColor<ColorChannel> | string
  text?: FieldChannel | string
  label?: FieldChannel | string
}

export type LegacyFeatures = Omit<RowFeaturesSpec, 'encoding'> & {
  encoding?: LegacyFeatureEncoding
}

export type LegacyRowPanel = RowFeaturesSpec | LegacyStrip | LegacyFeatures

function readFeatureEncoding({
  fill,
  color,
  text,
  label,
}: LegacyFeatureEncoding) {
  const body = fill ?? color
  const words = text ?? label
  return {
    ...(body === undefined ? {} : { fill: readChannel(body) }),
    ...(words === undefined
      ? {}
      : { text: typeof words === 'string' ? { field: words } : words }),
  }
}

function readStrip({
  kind,
  width,
  header,
  encoding,
  field = '',
  ...members
}: LegacyStrip): RowStripSpec {
  return {
    kind,
    ...(width === undefined ? {} : { width }),
    ...(header === undefined ? {} : { header }),
    encoding: {
      fill: encoding?.fill
        ? readChannel(encoding.fill)
        : readColor({ field, ...members }),
    },
  }
}

/**
 * Lifts a strip's color members into `encoding.fill`, a features panel's
 * `encoding.color` into `encoding.fill` and its `label` into `encoding.text`,
 * and each color object through `readColor`
 */
export function readRowPanel(panel: LegacyRowPanel): RowPanelSpec {
  return panel.kind === 'features'
    ? panel.encoding
      ? { ...panel, encoding: readFeatureEncoding(panel.encoding) }
      : { ...panel, encoding: undefined }
    : readStrip(panel)
}

export type LegacyColumnTrack = Omit<ColumnTrackSpec, 'encoding'> & {
  encoding?: {
    color?: LegacyColor<ColorSpec>
    y?: { scale?: { domainMax?: number } }
  }
  max?: number
  colors?: Record<string, string>
  scales?: { y?: { domainMax?: number } }
}

/**
 * Lifts a column track's `colors` and a flat `encoding.color` onto
 * `encoding.color.scale`, and its `max` and `scales.y.domainMax` onto
 * `encoding.y.scale.domainMax`
 */
export function readColumnTrack({
  max,
  colors,
  scales,
  encoding,
  ...track
}: LegacyColumnTrack): ColumnTrackSpec {
  const color = encoding?.color
    ? readColor(encoding.color)
    : colors
      ? {
          scale: { domain: Object.keys(colors), range: Object.values(colors) },
        }
      : undefined
  const domainMax = encoding?.y?.scale?.domainMax ?? scales?.y?.domainMax ?? max
  return color || domainMax !== undefined
    ? {
        ...track,
        encoding: {
          ...(color ? { color } : {}),
          ...(domainMax === undefined ? {} : { y: { scale: { domainMax } } }),
        },
      }
    : track
}

/**
 * The color a scale gives each value listed, for a reader that keys colors by
 * value, such as the residue letters of a scheme or a text track
 */
export function colorTable(
  scale: ColorScale | undefined,
  values: Iterable<string>,
) {
  return Object.fromEntries(
    resolveScale(scale, values).legend.map(e => [e.id, e.color]),
  )
}

/**
 * The letter-to-color table an object `colorScheme` gives, a `{domain, range}`
 * scale or the earlier `{map}`
 */
export function letterColors(scheme: Exclude<ColorScheme, string>) {
  return 'map' in scheme ? scheme.map : colorTable(scheme, scheme.domain ?? [])
}

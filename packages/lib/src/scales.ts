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
 * The color object: the scale a channel reads its field through, the members
 * jbrowse-components' displays declare (its ADR-151). The values the field
 * takes are the scale's domain, `range` holds the colors they map onto, and
 * the legend is the guide listing each value with its color.
 *
 * - `scale`: the kind, `categorical` when unset and the only kind so far
 * - `domain`: values in legend order, each taking the `range` color at its own
 *   index; the field's other values follow in natural order
 * - `range`: a palette name (`ggplot`, `set1`, `dark2`, `okabeito`, `tableau`)
 *   or a list of colors, which colors as many values as it holds
 * - `title`: the legend's title, the field when unset
 *
 * Records declaring the same members, `title` included, share one scale.
 */
export interface ColorSpec {
  scale?: 'categorical'
  domain?: string[]
  range?: string | string[]
  title?: string
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

/**
 * The colors a `range` lists, read the way jbrowse-components'
 * `paletteFromSpec` reads a string: a palette name gives undefined here, and a
 * comma-separated list of colors gives the list
 */
function rangeList(range: ColorSpec['range']) {
  if (typeof range !== 'string') {
    return range
  }
  if (paletteNamed(range)) {
    return undefined
  }
  const colors = range.split(/,(?![^(]*\))/).map(c => c.trim())
  return colors.every(c => colord(c).isValid()) ? colors : undefined
}

function rangeColors(range: ColorSpec['range'], order: string[]) {
  const list = rangeList(range)
  return list
    ? new Map(order.slice(0, list.length).map((value, i) => [value, list[i]!]))
    : new Map(
        Object.entries(
          createPaletteMap(
            order,
            paletteNamed(typeof range === 'string' ? range : undefined),
          ),
        ),
      )
}

/**
 * The scale a channel reads its field through. `values` are the field's
 * values, in any order and with repeats. The domain lists the values `domain`
 * names first, then the rest in natural order, so a value keeps its color when
 * rows are re-ordered, collapsed or filtered.
 *
 * A palette name, or no `range` at all, colors every value: past the end of
 * the palette each takes an evenly spaced hue. A list of colors leaves the
 * values past its end uncolored, so `{domain, range}` colors the values it
 * names and no others.
 */
export function resolveScale(
  spec: ColorSpec | undefined,
  values: Iterable<string>,
): ResolvedScale {
  const present = new Set(values)
  const listed = new Set(spec?.domain)
  const order = [
    ...listed,
    ...[...present].filter(v => !listed.has(v)).sort(compareGroupKeys),
  ]
  const colors = rangeColors(spec?.range, order)
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
 * The key records share a scale under: the table and the members as declared,
 * with `title` standing in for the field. Two strips over one palette with no
 * title read two fields and list two legends; naming one title gives them one
 * scale and one legend.
 */
export function declarationKey({
  spec,
  field,
  table,
}: Pick<ScaleUse, 'spec' | 'field' | 'table'>) {
  const { scale = 'categorical', domain, range, title = field } = spec
  return JSON.stringify([table, scale, domain, range, title])
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
        spec,
        group.flatMap(u => u.values),
      )
      const shown = group[0]!.shown
        ? new Set(group.flatMap(u => u.shown ?? []))
        : undefined
      const scale: SharedScale = {
        ...resolved,
        key,
        title: spec.title ?? field,
        legend: shown
          ? resolved.legend.filter(entry => shown.has(entry.id))
          : resolved.legend,
      }
      return [key, scale] as const
    }),
  )
}

/** the spelling a color object had before ADR-151's: `{palette}` or `{map}` */
export interface LegacyScale {
  palette?: string
  map?: Record<string, string>
}

/** the members an older color object may carry in place of today's */
export interface LegacyColorMembers {
  scale?: ColorSpec['scale'] | LegacyScale
  legend?: string
}

/** a record as an older snapshot, R or Python may write it */
export type LegacyColor<T extends ColorSpec> = Omit<T, 'scale'> &
  LegacyColorMembers

function liftScale(scale: LegacyColorMembers['scale']): ColorSpec {
  return typeof scale !== 'object'
    ? scale === undefined
      ? {}
      : { scale }
    : scale.map
      ? { domain: Object.keys(scale.map), range: Object.values(scale.map) }
      : scale.palette === undefined
        ? {}
        : { range: scale.palette }
}

/**
 * Lifts the earlier spelling onto the color object: `{palette: p}` reads as
 * `{range: p}`, `{map: m}` as `{domain: keys(m), range: values(m)}`, and a
 * strip's `legend` as `title`. A member written in the new spelling wins.
 */
export function readColor<T extends LegacyColorMembers>({
  scale,
  legend,
  ...rest
}: T) {
  return {
    ...(legend === undefined ? {} : { title: legend }),
    ...liftScale(scale),
    ...rest,
  }
}

export type LegacyEncoding = LegacyColor<ColorEncoding> | LabelEncoding

export function readEncoding(encoding: LegacyEncoding): Encoding {
  return encoding.channel === 'featureLabel' ? encoding : readColor(encoding)
}

/** a strip in its earlier spelling, the color object's members on the record */
export type LegacyStrip = Omit<RowStripSpec, 'encoding'> &
  LegacyColor<ColorChannel>

/**
 * A features panel's channels in their earlier spelling: `color` for the
 * span's `fill`, and `label` as the bare field name
 */
export interface LegacyFeatureEncoding {
  fill?: ColorChannel
  color?: LegacyColor<ColorChannel>
  label?: string | FieldChannel
}

export type LegacyFeatures = Omit<RowFeaturesSpec, 'encoding'> & {
  encoding?: LegacyFeatureEncoding
}

export type LegacyRowPanel = RowPanelSpec | LegacyStrip | LegacyFeatures

function readFeatureEncoding({ fill, color, label }: LegacyFeatureEncoding) {
  const lifted = fill ?? (color ? readColor(color) : undefined)
  return {
    ...(lifted ? { fill: lifted } : {}),
    ...(label === undefined
      ? {}
      : { label: typeof label === 'string' ? { field: label } : label }),
  }
}

function readStrip(strip: RowStripSpec | LegacyStrip) {
  return 'encoding' in strip ? strip : liftStrip(strip)
}

function liftStrip({
  kind,
  width,
  header,
  ...color
}: LegacyStrip): RowStripSpec {
  return {
    kind,
    ...(width === undefined ? {} : { width }),
    ...(header === undefined ? {} : { header }),
    encoding: { fill: readColor(color) },
  }
}

/**
 * Lifts a strip's flat color members into `encoding.fill`, and a features
 * panel's `encoding.color` into `encoding.fill` and a bare `label` field into
 * `{field}`
 */
export function readRowPanel(panel: LegacyRowPanel): RowPanelSpec {
  return panel.kind === 'features'
    ? panel.encoding
      ? { ...panel, encoding: readFeatureEncoding(panel.encoding) }
      : { ...panel, encoding: undefined }
    : readStrip(panel)
}

export type LegacyColumnTrack = ColumnTrackSpec & {
  max?: number
  colors?: Record<string, string>
  scales?: { y?: { domainMax?: number } }
}

/**
 * Lifts a column track's `colors` onto `encoding.color`, and its `max` and
 * `scales.y.domainMax` onto `encoding.y.domainMax`
 */
export function readColumnTrack({
  max,
  colors,
  scales,
  ...track
}: LegacyColumnTrack): ColumnTrackSpec {
  const color =
    track.encoding?.color ??
    (colors
      ? { domain: Object.keys(colors), range: Object.values(colors) }
      : undefined)
  const domainMax = track.encoding?.y?.domainMax ?? scales?.y?.domainMax ?? max
  return color || domainMax !== undefined
    ? {
        ...track,
        encoding: {
          ...(color ? { color } : {}),
          ...(domainMax === undefined ? {} : { y: { domainMax } }),
        },
      }
    : track
}

/**
 * The color a color object gives each value listed, for a reader that keys
 * colors by value, such as the residue letters of a scheme or a text track
 */
export function colorTable(spec: ColorSpec, values: Iterable<string>) {
  return Object.fromEntries(
    resolveScale(spec, values).legend.map(e => [e.id, e.color]),
  )
}

/**
 * The letter-to-color table an object `colorScheme` gives, `{domain, range}`
 * or the earlier `{map}`
 */
export function letterColors(scheme: Exclude<ColorScheme, string>) {
  return 'map' in scheme ? scheme.map : colorTable(scheme, scheme.domain ?? [])
}

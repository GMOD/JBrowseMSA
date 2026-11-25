import { defaultColorSchemeName } from './constants.ts'
import { letterColors } from './scales.ts'

/**
 * The residue mark's scale. `scheme` names a built-in scheme, and `domain`
 * lists residue letters that take the `range` color at their own index. A
 * `domain` wins over `scheme` and leaves every letter it does not list
 * uncolored.
 */
export interface ResidueScale {
  scheme?: string
  domain?: string[]
  range?: string[]
}

/**
 * The residue mark's color object. `channel` is what the color paints: `fill`
 * (the default) the cell, `color` the letter. `field` is what a cell reads:
 * `residue`, its letter through `scale`, or `feature` (the default), the color
 * the annotation overlay gives the span covering it, wherever the overlay
 * draws a span. The `color` channel reads the residue. See docs/layers.md
 */
export interface ResidueColor {
  channel?: 'fill' | 'color'
  field?: 'residue' | 'feature'
  scale?: ResidueScale
}

/**
 * A host's default residue color, which `MSAModelF({defaults})` puts in place
 * of the library's `fill`, `feature` and `maeditor`
 */
export interface ResidueColorDefault {
  channel?: ResidueColor['channel']
  field?: ResidueColor['field']
  scale?: { scheme?: string }
}

/** the value each member of the residue color takes where it is left out */
export function residueColorBase(defaults: ResidueColorDefault = {}) {
  return {
    channel: defaults.channel ?? 'fill',
    field: defaults.field ?? 'feature',
    scheme: defaults.scale?.scheme ?? defaultColorSchemeName,
  }
}

export type ResidueColorBase = ReturnType<typeof residueColorBase>

const libraryBase = residueColorBase()

/** the members of the residue color the cell renderers read */
export function resolveResidueColor(
  color: ResidueColor,
  base: ResidueColorBase = libraryBase,
) {
  const scale = color.scale ?? {}
  return {
    channel: color.channel ?? base.channel,
    field: color.field ?? base.field,
    scheme: scale.scheme ?? base.scheme,
    letters: scale.domain
      ? letterColors({ domain: scale.domain, range: scale.range })
      : undefined,
  }
}

/**
 * The residue color with each member at its default left out, so a view at
 * the defaults writes none into its snapshot
 */
export function normalizedResidueColor(
  { channel, field, scale }: ResidueColor,
  base: ResidueColorBase = libraryBase,
): ResidueColor {
  const scheme = scale?.scheme === base.scheme ? undefined : scale?.scheme
  const kept = {
    ...(scheme === undefined ? {} : { scheme }),
    ...(scale?.domain ? { domain: scale.domain } : {}),
    ...(scale?.range ? { range: scale.range } : {}),
  }
  return {
    ...(channel === undefined || channel === base.channel ? {} : { channel }),
    ...(field === undefined || field === base.field ? {} : { field }),
    ...(Object.keys(kept).length > 0 ? { scale: kept } : {}),
  }
}

/** the snapshot keys a residue color held before `residueColor` */
export interface LegacyColorKeys {
  bgColor?: boolean
  colorSchemeName?: string
  customColorScheme?: Record<string, string>
  domainFill?: boolean
  residueColor?: ResidueColor
}

/**
 * Reads the keys a snapshot or a shared link wrote before `residueColor` into
 * it: `bgColor: false` is the `color` channel, `domainFill: false` the
 * `residue` field, `colorSchemeName` the scheme and a `customColorScheme` map
 * the `domain` and `range`. A `residueColor` in the same snapshot wins member
 * by member.
 */
export function liftResidueColor<S extends LegacyColorKeys>(
  snapshot: S,
  base: ResidueColorBase = libraryBase,
) {
  return isObject(snapshot) ? liftKeys(snapshot, base) : snapshot
}

// MST runs the preprocessor on whatever it validates, undefined included,
// before it checks for an object
function isObject(value: unknown) {
  return typeof value === 'object' && value !== null
}

function liftKeys<S extends LegacyColorKeys>(
  snapshot: S,
  base: ResidueColorBase,
) {
  const {
    bgColor,
    colorSchemeName,
    customColorScheme,
    domainFill,
    residueColor,
  } = snapshot
  const lifted: ResidueColor = {
    ...(bgColor === false ? { channel: 'color' } : {}),
    ...(domainFill === false ? { field: 'residue' } : {}),
    scale: {
      ...(colorSchemeName === undefined ? {} : { scheme: colorSchemeName }),
      ...(customColorScheme
        ? {
            domain: Object.keys(customColorScheme),
            range: Object.values(customColorScheme),
          }
        : {}),
      ...residueColor?.scale,
    },
  }
  return {
    ...snapshot,
    residueColor: normalizedResidueColor(
      { ...lifted, ...residueColor, scale: lifted.scale },
      base,
    ),
  }
}

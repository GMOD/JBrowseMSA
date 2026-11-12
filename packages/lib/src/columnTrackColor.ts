import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'

import type { ColorChannel } from './scales.ts'
import type { ColumnTrackSpec } from './types.ts'

extend([namesPlugin])

/**
 * A color an identity scale gives a value, undefined where the value names no
 * color, so a canvas never keeps the previous fill for it
 */
export function paintableColor(color: string | undefined) {
  return color !== undefined && colord(color).isValid() ? color : undefined
}

/** a number, or undefined where a value is missing or no finite number */
export function finiteNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** a number as the string a scale reads, undefined where it is missing */
export function numberText(value: number | null | undefined) {
  const n = finiteNumber(value)
  return n === undefined ? undefined : String(n)
}

/**
 * The one color a bar, strip, text or arc track paints in:
 * `encoding.color.value`, else the `color` shorthand while `encoding.color`
 * is unset
 */
export function trackConstantColor(track: ColumnTrackSpec) {
  const color = track.encoding?.color
  return track.kind === 'features'
    ? undefined
    : color
      ? color.value
      : track.color
}

/**
 * The color object a bar, strip, text or arc track reads its own values
 * through, with the track's name standing as its field: an `encoding.color`
 * holding no `value`, and a strip's unset one, which reads its values through
 * the default scale. This is jbrowse-components' `withImpliedField`.
 */
export function trackColorChannel(
  track: ColumnTrackSpec,
): ColorChannel | undefined {
  const color = track.encoding?.color
  return track.kind === 'features'
    ? undefined
    : color
      ? color.value === undefined
        ? { ...color, field: track.name }
        : undefined
      : track.kind === 'strip' && track.color === undefined
        ? { field: track.name }
        : undefined
}

/**
 * The value an arc's color reads: its `value`, or under an identity scale its
 * own `color`, which the scale then lists in a legend, as a GFF `color=` is
 */
export function arcColorValue(
  arc: { value?: number; color?: string },
  identity: boolean,
) {
  return identity ? arc.color : numberText(arc.value)
}

/**
 * The values a track's color reads, as strings: a bar's or a strip's
 * numbers, each arc's value, and a text track's distinct characters in
 * upper case, a blank standing for no value
 */
export function trackColorValues(track: ColumnTrackSpec, identity: boolean) {
  return track.kind === 'arc'
    ? (track.arcs ?? []).map(arc => arcColorValue(arc, identity))
    : track.kind === 'text'
      ? [...new Set(track.data ?? '')].map(letterValue)
      : (track.values ?? []).map(numberText)
}

/** a text track's character as its color reads it */
export function letterValue(letter: string) {
  return letter.trim() === '' ? undefined : letter.toUpperCase()
}

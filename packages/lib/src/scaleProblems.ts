// The combinations of a color object's members that no single member can
// refuse, and their messages, copied from jbrowse-components
// packages/core/src/util/colorScale.ts (`colorProblems`, `scaleEndProblems`),
// which no @jbrowse/core release the plugin's hosts run ships.

import { rampSchemes, isRampScheme } from './colorRamp.ts'
import { namedPalettes, paletteNamed } from './ggplotPalettes.ts'
import { scaleKind } from './scales.ts'

import type { ColorSpec } from './scales.ts'

/** A combination of a color object's members the viewer cannot draw as written. */
export interface ScaleProblem {
  rule:
    | 'scale-type'
    | 'threshold-cuts'
    | 'threshold-range'
    | 'ramp-domain'
    | 'ramp-range'
    | 'domain-ends'
    | 'domain-quantile'
    | 'log-floor'
    | 'labels-domain'
    | 'unknown-scheme'
    | 'identity-colors'
  /** the member to look at, relative to the color object */
  slot: string
  message: string
}

/**
 * A problem with one record's color object. `record` is where the record sits
 * in the snapshot, such as `encodings[0]` or `rowPanels[2].encoding.fill`.
 */
export interface RecordScaleProblem extends ScaleProblem {
  record: string
}

/** a problem as one line, `encodings[0].scale.domainMax: ...` */
export function problemLine({ record, slot, message }: RecordScaleProblem) {
  return `${record}.${slot}: ${message}`
}

const palettes = ['ggplot', ...Object.keys(namedPalettes)]

function schemeProblems(
  scheme: string | undefined,
  ordinal: boolean,
): ScaleProblem[] {
  return scheme === undefined ||
    (ordinal
      ? scheme === 'ggplot' || !!paletteNamed(scheme)
      : isRampScheme(scheme))
    ? []
    : [
        {
          rule: 'unknown-scheme',
          slot: 'scale.scheme',
          message: ordinal
            ? `an ordinal scale takes the palettes ${palettes.join(', ')}, and "${scheme}" is ${isRampScheme(scheme) ? 'a ramp, which a linear, log or threshold scale samples' : 'none of them'}, so the scale draws the ggplot palette`
            : `a linear, log or threshold scale takes the ramps ${rampSchemes.join(', ')}, and "${scheme}" is none of them, so the scale samples viridis`,
        },
      ]
}

/**
 * What a ramp's ends say together that neither can refuse alone: a
 * `domainMax` below its `domainMin`, a quantile outside 0.5 to 1, and a log
 * scale's `domainMin` at or below 0
 */
function scaleEndProblems({ scale }: ColorSpec): ScaleProblem[] {
  const { type, domainMin, domainMax, domainQuantile } = scale ?? {}
  return [
    ...(type === 'log' && domainMin !== undefined && domainMin <= 0
      ? [
          {
            rule: 'log-floor' as const,
            slot: 'scale.domainMin',
            message: `a log scale has no ${domainMin}: the end floors to a positive value, so leave domainMin unset to follow the data or pin it above 0`,
          },
        ]
      : []),
    ...(domainMin !== undefined &&
    domainMax !== undefined &&
    domainMin > domainMax
      ? [
          {
            rule: 'domain-ends' as const,
            slot: 'scale.domainMax',
            message:
              'domainMax is below domainMin: the scale spans the two in order either way, and reverse is what turns it round',
          },
        ]
      : []),
    ...(domainQuantile !== undefined &&
    !(domainQuantile >= 0.5 && domainQuantile <= 1)
      ? [
          {
            rule: 'domain-quantile' as const,
            slot: 'scale.domainQuantile',
            message:
              'domainQuantile is a fraction from 0.5 to 1, not a percent: 1 follows the extremes and 0.99 clips the outermost 1% at each end; above 1 reads as 1 and below 0.5 as 0.5',
          },
        ]
      : []),
  ]
}

/**
 * What a color object's members say together that no single member can
 * refuse. The viewer draws what it can, lists these as `scaleProblems` and
 * notes the first in the scale's legend.
 */
export function colorProblems(spec: ColorSpec): ScaleProblem[] {
  const { scale, legend } = spec
  const kind = scaleKind(scale)
  const domain = scale?.domain ?? []
  const range = scale?.range ?? []
  const labels = legend?.labels ?? []
  const problems: ScaleProblem[] = []
  if (scale?.type !== undefined && scale.type !== kind) {
    problems.push({
      rule: 'scale-type',
      slot: 'scale.type',
      message: `"${String(scale.type)}" is no scale type: ordinal, linear, log, threshold and identity are, and the scale reads as ordinal`,
    })
  }
  if (kind === 'threshold') {
    if (
      domain.some(
        (cut, i) =>
          cut === '' ||
          !Number.isFinite(Number(cut)) ||
          Number(cut) <= Number(domain[i - 1]),
      )
    ) {
      problems.push({
        rule: 'threshold-cuts',
        slot: 'scale.domain',
        message:
          'threshold cuts are distinct numbers, read in ascending order, with the range running from the lowest interval; a repeated cut leaves an interval no value falls in',
      })
    }
    if (
      domain.length > 0 &&
      range.length > 0 &&
      range.length !== domain.length + 1
    ) {
      problems.push({
        rule: 'threshold-range',
        slot: 'scale.range',
        message: `${domain.length} threshold ${domain.length === 1 ? 'cut makes' : 'cuts make'} ${domain.length + 1} intervals, one color each, and range lists ${range.length}: a missing color samples the scheme, else viridis, and an extra one is never read`,
      })
    }
  }
  if (kind === 'linear' || kind === 'log') {
    if (domain.length > 0) {
      problems.push({
        rule: 'ramp-domain',
        slot: 'scale.domain',
        message:
          "a linear or log scale reads no domain, which is an ordinal scale's order and a threshold scale's cuts; a ramp's ends are domainMin and domainMax",
      })
    }
    if (range.length === 1) {
      problems.push({
        rule: 'ramp-range',
        slot: 'scale.range',
        message:
          'a linear or log ramp runs between at least two colors, and one paints every value alike',
      })
    }
    problems.push(...scaleEndProblems(spec))
  }
  if (
    kind === 'identity' &&
    (range.length > 0 || scale?.scheme !== undefined)
  ) {
    problems.push({
      rule: 'identity-colors',
      slot: range.length > 0 ? 'scale.range' : 'scale.scheme',
      message:
        'an identity scale paints each value as the color it names and reads no range or scheme; domain lists the colors its legend names',
    })
  }
  const named =
    kind === 'ordinal' || kind === 'identity'
      ? domain.length
      : kind === 'threshold'
        ? domain.length + 1
        : undefined
  if (labels.length > 0 && labels.length !== named) {
    const what =
      kind === 'ordinal' ? 'value' : kind === 'identity' ? 'color' : 'interval'
    problems.push({
      rule: 'labels-domain',
      slot: 'legend.labels',
      message:
        named === undefined
          ? "labels names an ordinal scale's domain values, an identity scale's colors or a threshold scale's intervals, and a ramp has none of them"
          : `labels gives each ${what} its name in the legend, and ${labels.length} ${labels.length === 1 ? 'label meets' : 'labels meet'} ${named} ${named === 1 ? what : `${what}s`}`,
    })
  }
  if (kind !== 'identity') {
    problems.push(...schemeProblems(scale?.scheme, kind === 'ordinal'))
  }
  return problems
}

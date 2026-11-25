import { packDomainLanes } from './components/msa/packDomainLanes.ts'
import { domainUnderlineHeight } from './constants.ts'
import { featureField } from './featureFields.ts'
import { valuesPassFilters } from './rowTransform.ts'

import type {
  AlignmentMarkSpec,
  Annotation,
  DomainBand,
  FeatureEncodingSpec,
  FeatureFilter,
} from './types.ts'

/**
 * A `marks` record the alignment panel draws, with the members a problem
 * refused left out. `index` is the record's place in `marks`.
 */
export interface AlignmentMark {
  index: number
  filter?: FeatureFilter[]
  encoding?: FeatureEncodingSpec
  height?: number | { band: number }
}

/** a `marks` record the viewer cannot draw as written, and what it drew */
export interface MarkProblem {
  rule: 'mark-kind' | 'mark-height' | 'mark-filter'
  /** where the record sits in the snapshot, such as `marks[1]` */
  record: string
  /** the member to look at, relative to the record */
  slot: string
  message: string
}

const unsetMarks: AlignmentMark[] = [{ index: 0 }]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function drawnKind(mark: unknown) {
  return isRecord(mark) && mark.kind === 'features'
}

function heightProblem(height: unknown) {
  return height === undefined ||
    (typeof height === 'number' && height > 0) ||
    (isRecord(height) &&
      typeof height.band === 'number' &&
      height.band > 0 &&
      height.band <= 1)
    ? undefined
    : isRecord(height)
      ? {
          slot: 'height.band',
          message: `band is a fraction of the row height above 0 and at most 1, and ${JSON.stringify(height.band)} is outside it, so the mark takes the height the cell fill gives it`,
        }
      : {
          slot: 'height',
          message: `height is a number of pixels above 0 or {band}, and ${JSON.stringify(height)} is neither, so the mark takes the height the cell fill gives it`,
        }
}

function filterProblem(filter: unknown) {
  return !isRecord(filter) ||
    typeof filter.field !== 'string' ||
    filter.field === ''
    ? 'a filter names the field it tests, and this one names none, so the mark draws as if it were left out'
    : Array.isArray(filter.oneOf) ||
        (Array.isArray(filter.range) && filter.range.length === 2)
      ? undefined
      : 'a filter lists the values kept as oneOf or the bounds as a two-number range, and this one lists neither, so the mark draws as if it were left out'
}

/**
 * The problems of each `marks` record: a `kind` the alignment panel does not
 * draw, a `height` of no pixels or a `band` outside (0, 1], and a filter
 * naming no field or no test
 */
export function markProblems(marks: readonly unknown[]) {
  return marks.flatMap((mark, i): MarkProblem[] => {
    const record = `marks[${i}]`
    const height = isRecord(mark) ? heightProblem(mark.height) : undefined
    const filters: unknown[] =
      isRecord(mark) && Array.isArray(mark.filter) ? mark.filter : []
    return drawnKind(mark)
      ? [
          ...(height
            ? [{ rule: 'mark-height' as const, record, ...height }]
            : []),
          ...filters.flatMap((filter, j) => {
            const message = filterProblem(filter)
            return message
              ? [
                  {
                    rule: 'mark-filter' as const,
                    record,
                    slot: `filter[${j}]`,
                    message,
                  },
                ]
              : []
          }),
        ]
      : [
          {
            rule: 'mark-kind',
            record,
            slot: 'kind',
            message: `the alignment panel draws marks of kind "features", and ${JSON.stringify(isRecord(mark) ? mark.kind : mark)} is not one, so the record draws nothing`,
          },
        ]
  })
}

/**
 * The marks the alignment panel draws: one over every feature while `marks`
 * is unset, else each `features` record with the members `markProblems`
 * refuses left out. A record of another kind draws nothing.
 */
export function alignmentMarks(
  marks: readonly AlignmentMarkSpec[] | undefined,
): AlignmentMark[] {
  return marks === undefined
    ? unsetMarks
    : marks.flatMap((mark, index) => {
        const filter = Array.isArray(mark.filter)
          ? mark.filter.filter(f => !filterProblem(f))
          : []
        return drawnKind(mark)
          ? [
              {
                index,
                ...(filter.length > 0 ? { filter } : {}),
                ...(mark.encoding ? { encoding: mark.encoding } : {}),
                ...(mark.height !== undefined && !heightProblem(mark.height)
                  ? { height: mark.height }
                  : {}),
              },
            ]
          : []
      })
}

/** whether a feature passes every test of a mark's `filter` */
export function featurePasses(annotation: Annotation, filter: FeatureFilter[]) {
  return valuesPassFilters(field => featureField(annotation, field), filter)
}

/** the features of `annotations` a mark draws */
export function markAnnotations(
  annotations: Annotation[],
  filter: FeatureFilter[] | undefined,
) {
  return filter
    ? annotations.filter(annotation => featurePasses(annotation, filter))
    : annotations
}

function bandsWhere(
  bands: Map<string, DomainBand[]>,
  keep: (band: DomainBand) => boolean,
  relane: boolean,
) {
  const out = new Map<string, DomainBand[]>()
  for (const [name, row] of bands) {
    const kept = row.filter(keep)
    if (kept.length > 0) {
      out.set(
        name,
        relane
          ? packDomainLanes(
              kept.map((band, stackIndex) => ({ ...band, stackIndex })),
            )
          : kept,
      )
    }
  }
  return out
}

/**
 * The bands of `bands` some mark draws, one set of lanes per row between
 * them, so the sub-row layout stacks every mark's spans clear of each other.
 * Where a mark has no filter it draws every band, and `bands` come back as
 * they are.
 */
export function markedBands(
  bands: Map<string, DomainBand[]>,
  marks: AlignmentMark[],
) {
  const filters = marks.map(mark => mark.filter)
  return filters.includes(undefined)
    ? bands
    : bandsWhere(
        bands,
        band =>
          filters.some(
            filter => !!filter && featurePasses(band.annotation, filter),
          ),
        true,
      )
}

/** the bands of `bands` whose feature passes `filter`, in their lanes */
export function bandsPassing(
  bands: Map<string, DomainBand[]>,
  filter: FeatureFilter[] | undefined,
) {
  return filter
    ? bandsWhere(bands, band => featurePasses(band.annotation, filter), false)
    : bands
}

/**
 * The pixel height of a mark's spans in a row, and whether they draw as a bar
 * at the foot of the row. A `height` is drawn as written, at most the row
 * height. With none, a span is the underline bar where `underline` says the
 * residues or the letters take the cells and the letters are drawn, and as
 * tall as the row otherwise.
 */
export function markSpanHeight(
  height: AlignmentMark['height'],
  { rowHeight, underline }: { rowHeight: number; underline: boolean },
) {
  const h =
    height === undefined
      ? underline
        ? Math.min(domainUnderlineHeight, rowHeight)
        : rowHeight
      : typeof height === 'number'
        ? Math.min(height, rowHeight)
        : height.band * rowHeight
  return { h, bar: height === undefined ? underline : h < rowHeight }
}

/** a row's bands ordered by start column, for a left-to-right sweep */
export function bandsByStart(bands: Map<string, DomainBand[]>) {
  return new Map(
    [...bands].map(
      ([name, row]) =>
        [name, row.toSorted((a, b) => a.startCol - b.startCol)] as const,
    ),
  )
}

/**
 * An alignment mark with its spans per row, the fill and outline of each
 * feature it draws, and the text drawn inside each span
 */
export interface ResolvedMark extends AlignmentMark {
  bands: Map<string, DomainBand[]>
  colors: Map<Annotation, { fill: string; stroke: string }>
  labels: Map<Annotation, string> | undefined
}

import { packDomainLanes } from './components/msa/packDomainLanes.ts'
import { defaultFeaturePanelWidth } from './constants.ts'
import { featureField } from './featureFields.ts'
import { outlineColor } from './util.ts'

import type {
  Annotation,
  DomainBand,
  FeaturePosition,
  RowFeaturesSpec,
  RowPanelSpan,
  RowPanelSpec,
} from './types.ts'

// the fill of a span under a scale that gives its value no color, such as a
// gene a `domain` of gene names leaves out
export const UNSCALED_FEATURE = '#d9d9d9'

// the fraction of a span a following one may cover before it takes a lane of
// its own in a `features` panel
const laneOverlap = 0.1

// a row panel's own width, or a default: the row height, which makes a strip
// cell square, and a gene neighborhood's width for a features panel. The row
// height is read only when used, so a panel with a width of its own does not
// recompute on a vertical zoom
export function rowPanelWidth(
  panel: RowPanelSpec,
  view: { rowHeight: number },
) {
  return (
    panel.width ??
    (panel.kind === 'features' ? defaultFeaturePanelWidth : view.rowHeight)
  )
}

// one row of the row table as the channels read it. A number or a boolean
// reads as its string, the way a GFF value does, and null or an object drops
export function stringFields(row: unknown) {
  if (typeof row !== 'object' || row === null) {
    return undefined
  }
  const fields: Record<string, string> = {}
  for (const [field, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      fields[field] = value
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      fields[field] = String(value)
    }
  }
  return fields
}

// the color each row takes from a field of the row table under a scale
export function colorByRow(
  rowData: Record<string, Record<string, string> | undefined>,
  field: string,
  colorOf: (value: string | undefined) => string | undefined,
) {
  const colors = new Map<string, string>()
  for (const [name, row] of Object.entries(rowData)) {
    const color = colorOf(row?.[field])
    if (color) {
      colors.set(name, color)
    }
  }
  return colors
}

// the fill and outline of every feature in a list: its own GFF `color=` first,
// then the scale an encoding resolves over one of its fields, then with no
// encoding the fill `unencoded` gives it, such as the accession palette's
export function featureColorMap(
  annotations: Annotation[],
  encoding:
    | {
        field: string
        colorOf: (value: string | undefined) => string | undefined
      }
    | undefined,
  unencoded: (annotation: Annotation) => string,
) {
  const strokes = new Map<string, string>()
  const strokeOf = (fill: string) => {
    const hit = strokes.get(fill)
    if (hit !== undefined) {
      return hit
    }
    const stroke = outlineColor(fill)
    strokes.set(fill, stroke)
    return stroke
  }
  return new Map(
    annotations.map(annotation => {
      const fill =
        annotation.color ??
        (encoding
          ? (encoding.colorOf(featureField(annotation, encoding.field)) ??
            UNSCALED_FEATURE)
          : unencoded(annotation))
      return [annotation, { fill, stroke: strokeOf(fill) }]
    }),
  )
}

// the text a label channel draws inside each span, for the features carrying
// the field it names
export function featureLabelMap(annotations: Annotation[], field: string) {
  const labels = new Map<Annotation, string>()
  for (const annotation of annotations) {
    const value = featureField(annotation, field)
    if (value !== undefined) {
      labels.set(annotation, value)
    }
  }
  return labels
}

/** what `packDomainLanes` needs to lay a row out, before it has its lane */
interface Unlaned {
  annotation: Annotation
  startCol: number
  endCol: number
}

type Laned<T> = T & { lane: number; laneCount: number }

function deepestLane(rows: { laneCount: number }[][]) {
  return rows.reduce((depth, row) => Math.max(depth, row[0]?.laneCount ?? 0), 0)
}

/**
 * Lanes for `position: "strandpile"`, gggenomes' `position_strandpile`: the
 * forward features stack above the line and the reverse below it, each strand
 * packing on its own. The deepest row on each side sets the grid every row lays
 * out on, so the line between the strands sits at one height down the panel and
 * a reader can scan it. A feature with no strand piles with the forward ones.
 */
function strandpileLanes<T extends Unlaned>(
  rows: [string, T[]][],
): Map<string, Laned<T>[]> {
  const piled = rows.map(([name, bands]) => {
    const reverse = packDomainLanes(
      bands.filter(b => b.annotation.strand === -1),
    )
    const forward = packDomainLanes(
      bands.filter(b => b.annotation.strand !== -1),
    )
    return { name, forward, reverse }
  })
  const up = deepestLane(piled.map(p => p.forward))
  const down = deepestLane(piled.map(p => p.reverse))
  const laneCount = up + down
  return new Map(
    piled.map(({ name, forward, reverse }) => [
      name,
      [
        // forward level 0 is the lane just above the line, stacking upward
        ...forward.map(b => ({ ...b, lane: up - 1 - b.lane, laneCount })),
        ...reverse.map(b => ({ ...b, lane: up + b.lane, laneCount })),
      ],
    ]),
  )
}

/**
 * Each row's spans laid out by a `position`, a row panel's or a features
 * track's, which is one row
 */
export function panelLanes<T extends Unlaned>(
  position: FeaturePosition | undefined,
  rows: [string, T[]][],
): Map<string, Laned<T>[]> {
  return position === 'strandpile'
    ? strandpileLanes(rows)
    : new Map(rows.map(([name, bands]) => [name, packDomainLanes(bands)]))
}

/**
 * The spans a `features` panel draws, keyed by row name and measured in the
 * panel's own pixels. `column` takes the bands the overlay draws, at the
 * alignment's column width. `position` packs each row's features in its own
 * residue positions, shifted by an `align` transform, and maps the extent they
 * cover across every row onto the panel width, so a row with no alignment
 * still has an x.
 */
export function featurePanelSpans({
  panel,
  width,
  colWidth,
  domainBands,
  annotationsByRow,
  shifts,
}: {
  panel: RowFeaturesSpec
  width: number
  colWidth: number
  domainBands: Map<string, DomainBand[]>
  annotationsByRow: Record<string, Annotation[]>
  shifts: Map<string, number> | undefined
}): Map<string, RowPanelSpan[]> {
  if (panel.x === 'column') {
    return panelLanes(
      panel.position,
      [...domainBands].map(([name, bands]) => [
        name,
        bands.map(band => ({
          ...band,
          xStart: band.startCol * colWidth,
          xEnd: band.endCol * colWidth,
        })),
      ]),
    )
  }
  const shifted = Object.entries(annotationsByRow).map(
    ([name, annotations]) => {
      const shift = shifts?.get(name) ?? 0
      return [
        name,
        annotations.map(annotation => ({
          annotation,
          start: annotation.start - 1 + shift,
          end: annotation.end + shift,
        })),
      ] as const
    },
  )
  let min = Infinity
  let max = -Infinity
  for (const [, features] of shifted) {
    for (const { start, end } of features) {
      min = Math.min(min, start)
      max = Math.max(max, end)
    }
  }
  // a gene arrow ends where its feature does, so the extent maps onto the whole
  // panel less the pixel the rightmost stroke needs
  const drawable = Math.max(1, width - 1)
  const scale = max > min ? drawable / (max - min) : 0
  // a lane opens where a span covers more than a tenth of the one before it,
  // which keeps the genes of an operon on one lane: adjacent genes commonly
  // share a few bases, and a stop codon overlapping the next start reads as a
  // second lane over the whole row
  return panelLanes(
    panel.position,
    shifted.map(([name, features]) => [
      name,
      features.map(({ annotation, start, end }) => ({
        annotation,
        xStart: (start - min) * scale,
        xEnd: (end - min) * scale,
        startCol: start,
        endCol: end - (end - start) * laneOverlap,
      })),
    ]),
  )
}

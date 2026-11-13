import type { MsaViewModel } from '../../model.ts'
import type { BasicTrack, ColumnSpan } from '../../types.ts'
import type { SpanSource } from '../msa/drawFeatureSpans.ts'

// a span keeps a pixel clear above and below it, so stacked lanes read apart
const laneGap = 2
// the head of a span in an unresized lane is as long as the span is tall, and
// a taller track keeps that length
const maxHeadLength = 16

/**
 * A features track's spans, in alignment pixels, with the mark the alignment
 * overlay and a `features` row panel draw: an arrow where the span carries a
 * strand, a box otherwise, labeled where the text fits. Overlapping spans
 * divide the track's height between their lanes.
 */
export function featureTrackSource(
  model: MsaViewModel,
  track: BasicTrack,
): SpanSource<ColumnSpan> | undefined {
  const { id, spans = [], height } = track.model
  const { colWidth } = model
  const scale = model.featureTrackScales.get(id)
  return scale
    ? {
        rows: spans.length > 0 ? [{ y: height, bands: spans }] : [],
        layout: {
          height: laneCount => Math.max(1, height / laneCount - laneGap),
          top: (_y, lane, h) => lane * (h + laneGap) + laneGap / 2,
          headLength: h => Math.min(h, maxHeadLength),
        },
        xOf: span => [span.startCol * colWidth, span.endCol * colWidth],
        colors: scale.colors,
        labelOf: span => scale.labels?.get(span.annotation),
      }
    : undefined
}

export function spansAtCol(spans: ColumnSpan[] | undefined, col: number) {
  return (spans ?? []).filter(s => s.startCol <= col && col < s.endCol)
}

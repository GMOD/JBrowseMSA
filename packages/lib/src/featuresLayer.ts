import type { Annotation, ColumnTrackSpec, Feature, SpanSpec } from './types.ts'

const placement = new Set(['row', 'start', 'end'])

// The colors and labels are maps keyed by annotation, and a getter read
// outside a reaction recomputes on every read. Caching on the frozen feature
// gives it one annotation however often the layer converts.
const converted = new WeakMap<Feature, Annotation>()
const trackConverted = new WeakMap<ColumnTrackSpec, Annotation[]>()

/**
 * The `features` layer as the annotations a GFF would parse to. Every field
 * but the placement is also an attribute, as a string like a GFF value, so an
 * encoding reads `type` or a host's own field the way it reads a GFF column 9
 * key.
 */
export function featuresToAnnotations(features: Feature[]): Annotation[] {
  return features.map(feature => {
    const cached = converted.get(feature)
    if (cached) {
      return cached
    }
    const annotation = spanAnnotation(feature, feature.row)
    converted.set(feature, annotation)
    return annotation
  })
}

/**
 * A features track's spans as annotations on the track's `row`, cached on the
 * frozen track record the way `featuresToAnnotations` caches on a feature
 */
export function trackAnnotations(track: ColumnTrackSpec): Annotation[] {
  const cached = trackConverted.get(track)
  if (cached) {
    return cached
  }
  const annotations = (track.features ?? []).map(span =>
    spanAnnotation(span, track.row),
  )
  trackConverted.set(track, annotations)
  return annotations
}

function spanAnnotation(span: SpanSpec, row: string | undefined): Annotation {
  const { start, end, name, description, type, strand, color } = span
  const accession =
    name ?? (row === undefined ? `${start}-${end}` : `${row}:${start}-${end}`)
  const attributes = Object.fromEntries(
    Object.entries(span)
      .filter(([key, value]) => !placement.has(key) && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  )
  return {
    id: row ?? '',
    accession,
    name: name ?? accession,
    description: description ?? name ?? accession,
    featureType: type,
    start,
    end,
    strand: strand === '+' ? 1 : strand === '-' ? -1 : undefined,
    color,
    attributes,
  }
}

import type { Annotation, Feature } from './types.ts'

const placement = new Set(['row', 'start', 'end'])

// The colors and labels are maps keyed by annotation, and a getter read
// outside a reaction recomputes on every read. Caching on the frozen feature
// gives it one annotation however often the layer converts.
const converted = new WeakMap<Feature, Annotation>()

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
    const annotation = featureAnnotation(feature)
    converted.set(feature, annotation)
    return annotation
  })
}

function featureAnnotation(feature: Feature): Annotation {
  const { row, start, end, name, description, type, strand, color } = feature
  const accession = name ?? `${row}:${start}-${end}`
  const attributes = Object.fromEntries(
    Object.entries(feature)
      .filter(([key, value]) => !placement.has(key) && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  )
  return {
    id: row,
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

import type { Annotation } from './types.ts'

/**
 * The value a feature gives an encoded field: an Annotation property, else one
 * of the GFF attributes the parser kept.
 */
export function featureField(annotation: Annotation, field: string) {
  const own = (annotation as unknown as Record<string, unknown>)[field]
  const value = own ?? annotation.attributes?.[field]
  return typeof value === 'string' ? value : undefined
}

/**
 * The name a feature answers to in a transform: its GFF `Name` attribute, else
 * the name the parser gave it.
 */
export function featureName(annotation: Annotation) {
  return featureField(annotation, 'Name') ?? featureField(annotation, 'name')
}

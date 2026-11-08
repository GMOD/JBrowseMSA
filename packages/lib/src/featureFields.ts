import { notEmpty } from '@jbrowse/core/util'

import type { Annotation } from './types.ts'

/**
 * The value a feature gives an encoded field: an Annotation property, else one
 * of the GFF attributes the parser kept.
 */
export function featureField(annotation: Annotation, field: string) {
  const own: unknown = Reflect.get(annotation, field)
  const value = own ?? annotation.attributes?.[field]
  return typeof value === 'string' ? value : undefined
}

export function featureValues(list: Annotation[], field: string) {
  return list.map(a => featureField(a, field)).filter(notEmpty)
}

/**
 * The name a feature answers to in a transform: its GFF `Name` attribute, else
 * the name the parser gave it.
 */
export function featureName(annotation: Annotation) {
  return featureField(annotation, 'Name') ?? featureField(annotation, 'name')
}

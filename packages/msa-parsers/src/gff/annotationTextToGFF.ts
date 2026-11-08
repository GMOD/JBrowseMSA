import { interProScanResponseToAnnotations } from '../interProScanToAnnotations.ts'
import { annotationsToGFF } from './annotationsToGFF.ts'

import type { InterProScanResponse } from '../types.ts'

function isInterProScanResponse(value: unknown): value is InterProScanResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'results' in value &&
    Array.isArray(value.results)
  )
}

/**
 * An annotation file's text as GFF3: GFF passes through, and the JSON an
 * InterProScan run returns converts, taking each result's row from its xref.
 */
export function annotationTextToGFF(text: string): string {
  const trimmed = text.trimStart()
  if (!trimmed.startsWith('{')) {
    return text
  }
  const response: unknown = JSON.parse(trimmed)
  if (!isInterProScanResponse(response)) {
    throw new Error('JSON annotation file has no InterProScan "results" list')
  }
  return annotationsToGFF(interProScanResponseToAnnotations(response))
}

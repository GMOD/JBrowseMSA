import { interProScanResponseToAnnotations } from '../interProScanToAnnotations.ts'
import { annotationsToGFF } from './annotationsToGFF.ts'

import type { InterProScanResponse } from '../types.ts'

/**
 * An annotation file's text as GFF3: GFF passes through, and the JSON an
 * InterProScan run returns converts, taking each result's row from its xref.
 */
export function annotationTextToGFF(text: string): string {
  const trimmed = text.trimStart()
  if (!trimmed.startsWith('{')) {
    return text
  }
  const response: InterProScanResponse = JSON.parse(trimmed)
  return annotationsToGFF(interProScanResponseToAnnotations(response))
}

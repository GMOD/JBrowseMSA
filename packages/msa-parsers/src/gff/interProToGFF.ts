import {
  indexResultsByXref,
  interProScanToAnnotations,
} from '../interProScanToAnnotations.ts'
import { annotationsToGFF } from './annotationsToGFF.ts'

import type { InterProScanResults } from '../types.ts'

/**
 * Convert InterProScan results, keyed by the row name they attach to, to GFF3.
 */
export function interProToGFF(
  results: Record<string, InterProScanResults>,
): string {
  return annotationsToGFF(interProScanToAnnotations(results))
}

/**
 * Convert a list of InterProScan results to GFF3, taking each one's row name
 * from its xref.
 */
export function interProResponseToGFF(results: InterProScanResults[]): string {
  return interProToGFF(indexResultsByXref(results))
}

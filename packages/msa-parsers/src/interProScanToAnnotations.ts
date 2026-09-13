import type {
  Annotation,
  InterProScanResponse,
  InterProScanResults,
} from './types.ts'

/**
 * Key each result by its xref id, which is the row name its annotations attach
 * to. A result without one is dropped rather than keyed `undefined`, which
 * would draw a phantom row's worth of annotations (and rather than throwing,
 * which would lose every other result over one malformed one).
 */
export function indexResultsByXref(results: InterProScanResults[]) {
  return Object.fromEntries(
    results
      .map(r => [r.xref[0]?.id, r] as const)
      .filter((e): e is [string, InterProScanResults] => e[0] !== undefined),
  )
}

/**
 * Flatten InterProScan results, keyed by the row name they attach to, into one
 * annotation per signature location.
 *
 * An unintegrated signature has no InterPro `entry` -- MobiDBLite's disorder
 * calls, and many CDD, Pfam and PANTHER hits -- and falling back to the
 * signature's own accession and name is the difference between drawing those
 * and dropping them. Only a signature with no accession at all has nothing to
 * color, filter or label by, and is dropped.
 */
export function interProScanToAnnotations(
  results: Record<string, InterProScanResults>,
): Annotation[] {
  return Object.entries(results).flatMap(([id, { matches }]) =>
    matches.flatMap(({ signature, locations }) => {
      const { entry } = signature
      const accession = entry?.accession ?? signature.accession
      if (!accession) {
        return []
      }
      const name = entry?.name ?? signature.name ?? accession
      return locations.map(({ start, end, strand }) => ({
        id,
        accession,
        name,
        description: entry?.description ?? signature.description ?? name,
        start,
        end,
        strand,
      }))
    }),
  )
}

/**
 * Flatten a whole InterProScan JSON response, resolving each result's row name
 * from its xref.
 */
export function interProScanResponseToAnnotations(
  response: InterProScanResponse,
): Annotation[] {
  return interProScanToAnnotations(indexResultsByXref(response.results))
}

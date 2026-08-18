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
 * annotation per signature location. A signature without an `entry` carries no
 * accession or name to color, filter or label by, so it is dropped.
 */
export function interProScanToAnnotations(
  results: Record<string, InterProScanResults>,
): Annotation[] {
  return Object.entries(results).flatMap(([id, { matches }]) =>
    matches.flatMap(({ signature: { entry }, locations }) =>
      entry
        ? locations.map(({ start, end, strand }) => ({
            id,
            accession: entry.accession,
            name: entry.name,
            description: entry.description,
            featureType: entry.featureType,
            start,
            end,
            strand,
          }))
        : [],
    ),
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

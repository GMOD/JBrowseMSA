import type { InterProScanResults } from '../types'

/**
 * Convert InterProScan results to GFF3 format
 */
export function interProToGFF(
  results: Record<string, InterProScanResults>,
): string {
  const lines: string[] = ['##gff-version 3']

  for (const [seqId, data] of Object.entries(results)) {
    for (const match of data.matches) {
      const entry = match.signature.entry
      if (!entry) {
        continue
      }

      for (const location of match.locations) {
        const attributes = [
          `Name=${encodeURIComponent(entry.accession)}`,
          `signature_desc=${encodeURIComponent(entry.name)}`,
          `description=${encodeURIComponent(entry.description)}`,
        ].join(';')

        const line = [
          seqId,
          'InterProScan',
          'protein_match',
          location.start,
          location.end,
          '.',
          '.',
          '.',
          attributes,
        ].join('\t')

        lines.push(line)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Convert InterProScan JSON response to GFF3 format
 */
export function interProResponseToGFF(results: InterProScanResults[]): string {
  const resultsMap: Record<string, InterProScanResults> = {}

  for (const result of results) {
    const seqId = result.xref[0]?.id
    if (seqId) {
      resultsMap[seqId] = result
    }
  }

  return interProToGFF(resultsMap)
}

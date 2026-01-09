import type {
  GFFRecord,
  InterProScanResponse,
  InterProScanResults,
} from '../types'

/**
 * Convert GFF records to InterProScan format
 *
 * InterProScan GFF3 output format:
 * - seq_id: sequence identifier
 * - source: database/signature (e.g., "Pfam", "SMART")
 * - type: usually "protein_match"
 * - start/end: domain positions (1-based)
 * - Attributes: Name (accession), signature_desc (name), Dbxref, etc.
 */
export function gffToInterProResults(
  gffRecords: GFFRecord[],
): Record<string, InterProScanResults> {
  const bySequence = new Map<string, GFFRecord[]>()

  for (const record of gffRecords) {
    const existing = bySequence.get(record.seq_id)
    if (existing) {
      existing.push(record)
    } else {
      bySequence.set(record.seq_id, [record])
    }
  }

  const results: Record<string, InterProScanResults> = {}

  for (const [seqId, records] of bySequence) {
    const matchesByAccession = new Map<
      string,
      { start: number; end: number }[]
    >()
    const matchInfo = new Map<
      string,
      { name: string; description: string; accession: string }
    >()

    for (const record of records) {
      const accession =
        (record.Name as string) ||
        (record.ID as string) ||
        `${record.source}_${record.start}_${record.end}`
      const name =
        (record.signature_desc as string) ||
        (record.Name as string) ||
        accession
      const description =
        (record.Ontology_term as string) ||
        (record.description as string) ||
        (record.Note as string) ||
        name

      if (!matchInfo.has(accession)) {
        matchInfo.set(accession, { name, description, accession })
      }

      const locations = matchesByAccession.get(accession)
      if (locations) {
        locations.push({ start: record.start, end: record.end })
      } else {
        matchesByAccession.set(accession, [
          { start: record.start, end: record.end },
        ])
      }
    }

    const matches = []
    for (const [accession, locations] of matchesByAccession) {
      const info = matchInfo.get(accession)!
      matches.push({
        signature: {
          entry: info,
        },
        locations,
      })
    }

    results[seqId] = {
      matches,
      xref: [{ id: seqId }],
    }
  }

  return results
}

/**
 * Convert GFF string directly to InterProScan format
 */
export function parseGFFToInterPro(
  gffStr: string,
  parseGFFfn: (str: string) => GFFRecord[],
): Record<string, InterProScanResults> {
  const records = parseGFFfn(gffStr)
  return gffToInterProResults(records)
}

/**
 * Create a full InterProScanResponse from GFF records
 */
export function gffToInterProResponse(
  gffRecords: GFFRecord[],
): InterProScanResponse {
  const resultsMap = gffToInterProResults(gffRecords)
  return {
    results: Object.values(resultsMap),
  }
}

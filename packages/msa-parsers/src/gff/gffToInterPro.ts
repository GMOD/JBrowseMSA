import type {
  GFFRecord,
  InterProScanResponse,
  InterProScanResults,
} from '../types.ts'

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
// Feature types that read as a directional "gene" and get an arrowhead in the
// overlay. Exon/CDS/UTR/domain features deliberately stay rectangular blocks —
// turning every exon into an arrow is misleading, since exons are segments of a
// single transcript, not independently-oriented genes.
const GENE_LEVEL_TYPES = new Set([
  'gene',
  'pseudogene',
  'mRNA',
  'transcript',
  'primary_transcript',
  'ncRNA',
  'tRNA',
  'rRNA',
  'snRNA',
  'snoRNA',
  'miRNA',
  'lnc_RNA',
])

// +1/-1 for a stranded gene-level feature, undefined otherwise (which the
// renderer draws as a plain block).
function geneStrand({ type, strand }: GFFRecord): number | undefined {
  const directional = strand === '+' ? 1 : strand === '-' ? -1 : undefined
  return GENE_LEVEL_TYPES.has(type) ? directional : undefined
}

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
      { start: number; end: number; strand?: number }[]
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

      const location = {
        start: record.start,
        end: record.end,
        strand: geneStrand(record),
      }
      const locations = matchesByAccession.get(accession)
      if (locations) {
        locations.push(location)
      } else {
        matchesByAccession.set(accession, [location])
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

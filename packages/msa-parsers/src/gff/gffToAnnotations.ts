import type { Annotation, GFFRecord } from '../types.ts'

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

/**
 * Convert GFF records to annotations, one per record, in file order.
 *
 * InterProScan's own GFF3 output falls out of the same mapping: it writes
 * `Name` as the signature accession and `signature_desc` as its human-readable
 * name, with domain positions 1-based.
 */
export function gffToAnnotations(gffRecords: GFFRecord[]): Annotation[] {
  return gffRecords.map(record => {
    const accession =
      (record.Name as string) ||
      (record.ID as string) ||
      `${record.source}_${record.start}_${record.end}`
    const name =
      (record.signature_desc as string) || (record.Name as string) || accession
    return {
      id: record.seq_id,
      accession,
      name,
      description:
        (record.Ontology_term as string) ||
        (record.description as string) ||
        (record.Note as string) ||
        name,
      featureType: record.type,
      start: record.start,
      end: record.end,
      strand: geneStrand(record),
    }
  })
}

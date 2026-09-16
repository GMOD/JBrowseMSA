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

// The nine columns a feature line holds; every other key of a record came from
// column 9
const GFF_COLUMNS = new Set([
  'seq_id',
  'source',
  'type',
  'start',
  'end',
  'score',
  'strand',
  'phase',
])

function attributesOf(record: GFFRecord) {
  const entries = Object.entries(record).filter(
    ([key, value]) => !GFF_COLUMNS.has(key) && typeof value === 'string',
  ) as [string, string][]
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

// JBrowse and IGV read an RGB triple as well as a named or hex color, and the
// attribute parser has already turned `255,0,0` into `255 0 0` by splitting on
// the GFF3 multi-value comma
const RGB_TRIPLE = /^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/

function cssColor(record: GFFRecord) {
  const value = (record.color ??
    record.colour ??
    record.Color ??
    record.Colour) as string | undefined
  if (!value) {
    return undefined
  }
  const triple = RGB_TRIPLE.exec(value.trim())
  return triple ? `rgb(${triple[1]},${triple[2]},${triple[3]})` : value.trim()
}

// InterProScan describes the sequence it scanned before listing the matches
// against it. Those lines span the whole row and carry no signature, so they
// would draw a full-width block labelled by an md5.
const WHOLE_SEQUENCE_TYPES = new Set(['polypeptide', 'nucleic_acid'])

/**
 * Convert GFF records to annotations, one per record, in file order.
 *
 * InterProScan's own GFF3 output falls out of the same mapping: it writes
 * `Name` as the signature accession and `signature_desc` as its human-readable
 * name, with domain positions 1-based.
 */
export function gffToAnnotations(gffRecords: GFFRecord[]): Annotation[] {
  return gffRecords
    .filter(record => !WHOLE_SEQUENCE_TYPES.has(record.type))
    .map(record => {
      const accession =
        (record.Name as string) ||
        (record.ID as string) ||
        `${record.source}_${record.start}_${record.end}`
      const name =
        (record.signature_desc as string) ||
        (record.Name as string) ||
        accession
      return {
        id: record.seq_id,
        accession,
        name,
        // not Ontology_term: a GO id list is what the domain is annotated
        // with, not what it is, and reading it first labelled every
        // InterProScan domain "GO:0003677 GO:0006281"
        description:
          (record.description as string) ||
          (record.Note as string) ||
          (record.signature_desc as string) ||
          name,
        featureType: record.type,
        start: record.start,
        end: record.end,
        strand: geneStrand(record),
        color: cssColor(record),
        attributes: attributesOf(record),
      }
    })
}

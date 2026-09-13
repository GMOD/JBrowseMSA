export interface Node {
  children?: Node[]
  name?: string
  length?: number
}

export interface NodeWithIds {
  id: string
  name: string
  children: NodeWithIds[]
  length?: number
  noTree?: boolean
}

export interface NodeWithIdsAndLength {
  id: string
  name: string
  children: NodeWithIdsAndLength[]
  noTree?: boolean
  length: number
}

// a per-column text track a file carries inline, such as a Stockholm #=GC line
export interface MSATrack {
  id: string
  name: string
  data?: string
  customColorScheme?: Record<string, string>
  defaultOff?: boolean
}

export interface GFFRecord {
  seq_id: string
  source: string
  type: string
  start: number
  end: number
  score: number
  strand: string
  phase: string
  [key: string]: string | number
}

/**
 * One annotation interval attached to an alignment row: a protein domain, an
 * exon, a gene. This is the canonical overlay shape -- every source
 * (InterProScan, GFF, a user upload) converts to a flat list of these, and the
 * viewer renders nothing else.
 */
export interface Annotation {
  /** name of the alignment row the interval attaches to */
  id: string
  /** stable key deciding color, legend membership and filter state */
  accession: string
  name: string
  description: string
  /**
   * original GFF feature type (exon, CDS, gene, ...) when sourced from GFF;
   * lets the viewer treat ordinal segments (exons) differently from
   * categorical domains
   */
  featureType?: string
  /** 1-based, inclusive of both ends */
  start: number
  end: number
  strand?: number
}

/**
 * One signature hit. `entry` is the InterPro entry the signature is integrated
 * into, and is null for an unintegrated one -- every MobiDBLite hit, and plenty
 * of CDD, Pfam and PANTHER ones -- which still has an accession and a name of
 * its own on the signature.
 */
export interface InterProScanMatch {
  signature: {
    accession?: string
    name?: string | null
    description?: string | null
    entry?: {
      name: string
      description: string
      accession: string
    } | null
  }
  locations: { start: number; end: number; strand?: number }[]
}

export interface InterProScanResults {
  matches: InterProScanMatch[]
  xref: { id: string }[]
}

export interface InterProScanResponse {
  results: InterProScanResults[]
}

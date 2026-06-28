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

export interface InterProScanMatch {
  signature: {
    entry?: {
      name: string
      description: string
      accession: string
      // original GFF feature type (exon, CDS, gene, ...) when sourced from GFF;
      // lets the viewer treat ordinal segments (exons) differently from
      // categorical domains
      featureType?: string
    }
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

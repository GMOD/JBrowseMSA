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
    }
  }
  locations: { start: number; end: number }[]
}

export interface InterProScanResults {
  matches: InterProScanMatch[]
  xref: { id: string }[]
}

export interface InterProScanResponse {
  results: InterProScanResults[]
}

export interface MSAParser {
  getMSA(): unknown
  getRow(name: string): string
  getWidth(): number
  getNames(): string[]
  getTree(): NodeWithIds
  getHeader(): unknown
  getRowData(name: string): unknown
  getStructures(): Record<string, unknown>
  alignmentNames: string[]
  seqConsensus: string | undefined
  secondaryStructureConsensus: string | undefined
  tracks: unknown[]
}

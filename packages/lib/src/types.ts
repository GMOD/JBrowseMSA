export interface Accession {
  accession: string
  name: string
  description: string
}
export interface BasicTrackModel {
  id: string
  name: string
  associatedRowName?: string
  height: number
}

export interface TextTrackModel extends BasicTrackModel {
  customColorScheme?: Record<string, string>
  data?: string
}

// a track that draws a per-column bar chart (conservation, property
// conservation). `barColor` doubles as the marker that a track is a bar track.
export interface BarTrackModel extends BasicTrackModel {
  barColor?: string
}

export interface BasicTrack {
  ReactComponent: React.FC<any>
  model: TextTrackModel & BarTrackModel
}

// one InterProScan/GFF annotation location flattened onto a single row, as
// produced by the model's tidyInterProAnnotations
export interface TidyDomainAnnotation {
  id: string
  name: string
  accession: string
  description: string
  featureType?: string
  start: number
  end: number
  strand?: number
}

// a tidy annotation resolved to the visible column span it is drawn across.
// stackIndex is its position among the bands its row actually draws, which the
// sub-row layout uses to stack boxes.
export interface DomainBand {
  annotation: TidyDomainAnnotation
  startCol: number
  endCol: number
  stackIndex: number
}

export interface Node {
  children?: Node[]
  name?: string
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

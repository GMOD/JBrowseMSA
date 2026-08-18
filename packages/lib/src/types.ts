import type { Annotation } from 'msa-parsers'

export interface Accession {
  accession: string
  name: string
  description: string
}
// which renderer draws a track's content. Every track kind draws into the same
// per-column coordinate space, so the kind picks the draw function rather than
// the geometry -- see drawTracks.ts, which dispatches on it.
export type TrackKind = 'text' | 'bar' | 'logo'

export interface BasicTrackModel {
  id: string
  name: string
  associatedRowName?: string
  height: number
  kind: TrackKind
}

export interface TextTrackModel extends BasicTrackModel {
  customColorScheme?: Record<string, string>
  data?: string
}

// a track that draws a per-column bar chart (conservation, property
// conservation)
export interface BarTrackModel extends BasicTrackModel {
  barColor?: string
}

export interface BasicTrack {
  ReactComponent: React.FC<any>
  model: TextTrackModel & BarTrackModel
}

// the overlay annotation itself lives in msa-parsers, alongside the adapters
// that build it. TidyDomainAnnotation is its former name, kept because
// downstream plugins name it in their emitted declarations.
export type { Annotation }
export type TidyDomainAnnotation = Annotation

// an annotation resolved to the visible column span it is drawn across.
// stackIndex is its position among the bands its row actually draws, which the
// sub-row layout uses to stack boxes.
export interface DomainBand {
  annotation: Annotation
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

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

export interface BasicTrack {
  ReactComponent: React.FC<any>
  model: TextTrackModel
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

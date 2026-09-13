import type { Annotation } from 'msa-parsers'

export interface Accession {
  accession: string
  name: string
  description: string
}
// which renderer draws a track's content. Every track kind draws into the same
// per-column coordinate space, so the kind picks the draw function rather than
// the geometry -- see drawTracks.ts, which dispatches on it.
export type TrackKind = 'text' | 'bar' | 'logo' | 'arc'

export interface BasicTrackModel {
  id: string
  name: string
  associatedRowName?: string
  height: number
  kind: TrackKind
  // hidden until the user asks for it, unless they have already chosen
  defaultOff?: boolean
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

// a pair of columns joined by an arc, already resolved to 0-based visible
// columns -- what the renderer consumes
export interface Arc {
  start: number
  end: number
  color?: string
}

// a track that joins pairs of columns with arcs (RNA base pairs, disulfide
// bonds, residue contacts)
export interface ArcTrackModel extends BasicTrackModel {
  arcs?: Arc[]
  arcColor?: string
}

export interface BasicTrack {
  ReactComponent: React.FC<any>
  model: TextTrackModel & BarTrackModel & ArcTrackModel
}

// one arc of an arc track, in the snapshot's own coordinates: 1-based and
// inclusive, alignment columns unless the track names a `row`
export interface ArcSpec {
  start: number
  end: number
  color?: string
}

// a track supplied as data in the snapshot rather than computed from the
// alignment. `values` (bar) or `data` (text) index alignment columns, or the
// 1-based residues of `row` when it names one; `arcs` (arc) name two such
// positions each
export interface ColumnTrackSpec {
  id: string
  name: string
  kind: 'bar' | 'text' | 'arc'
  values?: number[]
  data?: string
  arcs?: ArcSpec[]
  max?: number
  color?: string
  colors?: Record<string, string>
  row?: string
  height?: number
}

// One contiguous run where a row's residues and a structure's line up 1:1.
// Segment-shaped because SIFTS is: a dozen numbers cover what a per-residue
// array would spend kilobytes on, and it makes the refusal rule structural
// rather than a vocabulary -- a position no segment covers is unmapped, and
// there is no status field to disagree with.
export interface ResidueSegment {
  rowStart: number
  rowEnd: number
  structStart: number
  structEnd: number
}

// the structure half of a mapping. `id` is whatever the producer calls the
// entry (a PDB id, an AlphaFold accession); `asymId` names the chain, which is
// what distinguishes two mappings onto the same entry
export interface MappedStructure {
  id: string
  kind?: 'experimental' | 'predicted'
  asymId?: string
  url?: string
}

/**
 * Which residue of which structure a row's residue is, as data. Computed by
 * whatever knows how -- SIFTS, an AlphaFold model, a curator -- and carried in
 * the snapshot, because the viewer cannot work it out: matching a row to a
 * structure by sequence equality fails for a construct with an expression tag,
 * a truncation, an engineered residue, or a row that is a subsequence of the
 * entry, and it fails in the direction that looks like it worked.
 *
 * Positions are 1-based and inclusive on both sides, as GFF and `highlights`
 * are. Structure positions are `label_seq_id`, the index into the entity's
 * SEQRES; author numbering carries insertion codes and stays out.
 *
 * `unobserved` is in structure positions: present in SEQRES with no
 * coordinates. Worth distinguishing from unmapped, because "the
 * crystallographer could not see it" and "this protein does not have that
 * residue" mean different things to a reader.
 */
export interface ResidueMapping {
  row: string
  accession?: string
  structure: MappedStructure
  segments: ResidueSegment[]
  unobserved?: [number, number][]
  /**
   * ungapped length of the row this was computed against. Optional, and worth
   * setting: a mapping outlives the alignment it was made for, and pointing at
   * residue 58 of a sequence that has since been re-aligned, revised or swapped
   * is the failure this whole layer exists to avoid. Declared here, the viewer
   * can notice and refuse instead of answering from stale arithmetic.
   */
  rowLength?: number
  generated?: {
    by?: string
    date?: string
    sourceSha256?: string
  }
}

// why a mapping, or one segment of it, is not being used. Refusing silently
// leaves a host unable to tell "no structure for this row" from "the mapping
// no longer matches what is loaded", which are different problems with
// different fixes.
export interface ResidueMappingProblem {
  row: string
  structureId: string
  /**
   * `mapping` means the whole mapping is out: the evidence is about the row it
   * claims, so nothing it says can be trusted. `segment` takes only that
   * segment, since the rest of the mapping still describes residues that exist.
   */
  scope: 'mapping' | 'segment'
  reason: string
}

// what a lookup gives back: the structure residue a row residue is, or the row
// residue a structure residue is. `observed` is false for a residue the
// structure declares but did not resolve.
export interface StructureResidue {
  structure: MappedStructure
  position: number
  observed: boolean
}

export interface RowResidue {
  rowName: string
  seqPos: number
}

/**
 * One loaded document that the snapshot leaves behind, and how big it is.
 * `what` names it the way the import form does, since that is where the reader
 * would go to load it differently.
 */
export interface UnshareableData {
  what: 'alignment' | 'tree' | 'annotations' | 'row metadata'
  bytes: number
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

/**
 * A persistent, labeled highlight. Coordinates are 1-based and inclusive, as
 * GFF's are. `row` makes `start`/`end` residues of that row; without it they
 * are alignment columns. `rows` marks whole rows instead.
 */
export interface Highlight {
  row?: string
  rows?: string[]
  start?: number
  end?: number
  label?: string
  color?: string
}

/** a Highlight resolved to visible column indices and row indices */
export interface ResolvedHighlight {
  startCol?: number
  endCol?: number
  rowIndices: number[]
  label?: string
  color?: string
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

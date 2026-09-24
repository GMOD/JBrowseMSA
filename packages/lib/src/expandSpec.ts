import type { ColumnTrackSpec, Highlight, Region } from './types.ts'

/**
 * `row: null` opts one entry out of the spec's `query` row, back to alignment
 * columns.
 */
type RowChoice = { row?: string | null }

export type HighlightShorthand =
  | number
  | string
  | (Omit<Highlight, 'row'> & RowChoice)

export type RegionShorthand = string | (Omit<Region, 'row'> & RowChoice)

export type ColumnTrackShorthand = Omit<
  ColumnTrackSpec,
  'id' | 'kind' | 'row'
> &
  RowChoice & {
    id?: string
    kind?: ColumnTrackSpec['kind']
    /** the 1-based position `values` or `data` begins at */
    start?: number
  }

/**
 * The short forms a hand-written or generated link can use. Every long form
 * passes through unchanged, so a snapshot is also a valid spec.
 */
export interface MsaSpec {
  /**
   * The row the spec is about: sets `relativeTo`, and is the `row` of every
   * highlight, region and column track that names none
   */
  query?: string
  /** a url, or the alignment itself when it spans more than one line */
  msa?: string
  /** a url, or a newick string when it starts with "(" */
  tree?: string
  highlights?: HighlightShorthand[]
  region?: RegionShorthand
  columnTracks?: ColumnTrackShorthand[]
  [key: string]: unknown
}

/**
 * The label a single-residue shorthand highlight gets, filled in from the
 * sequence when drawn: `175` on a row reading R there becomes "R175".
 */
export const residueLabel = '{residue}{position}'

const span = /^(\d+)(?:-(\d+))?(?:\s+(.+))?$/

function parseSpan(text: string, what: string) {
  const match = span.exec(text.trim())
  if (!match) {
    throw new Error(
      `${what} "${text}" is not "start", "start-end" or either followed by a label`,
    )
  }
  const a = Number(match[1])
  const b = match[2] === undefined ? a : Number(match[2])
  return { start: Math.min(a, b), end: Math.max(a, b), label: match[3] }
}

function withRow<T extends RowChoice>(entry: T, query?: string) {
  const { row, ...rest } = entry
  const resolved = row === undefined ? query : (row ?? undefined)
  return resolved === undefined ? rest : { ...rest, row: resolved }
}

function expandHighlight(entry: HighlightShorthand, query?: string) {
  if (typeof entry === 'object') {
    return (
      entry.rows
        ? entry
        : withRow(entry, entry.start === undefined ? undefined : query)
    ) as Highlight
  }
  const { start, end, label } = parseSpan(String(entry), 'highlight')
  const single = start === end && query !== undefined
  return {
    ...(query === undefined ? {} : { row: query }),
    start,
    end,
    ...(label ? { label } : single ? { label: residueLabel } : {}),
  }
}

function expandRegion(region: RegionShorthand, query?: string) {
  if (typeof region === 'string') {
    const { start, end } = parseSpan(region, 'region')
    const parsed: Omit<Region, 'row'> & RowChoice = { start, end }
    return withRow(parsed, query) as Region
  }
  return withRow(region, query) as Region
}

function slug(name: string) {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
}

function kindOf(track: ColumnTrackShorthand) {
  if (track.kind) {
    return track.kind
  }
  if (track.values) {
    return 'bar'
  }
  if (track.data !== undefined) {
    return 'text'
  }
  if (track.arcs) {
    return 'arc'
  }
  throw new Error(
    `column track "${track.name}" has no values, data or arcs to take its kind from`,
  )
}

function expandTrack(
  track: ColumnTrackShorthand,
  query: string | undefined,
  ids: Set<string>,
): ColumnTrackSpec {
  const { start, ...rest } = track
  const pad = start && start > 1 ? start - 1 : 0
  let id = track.id ?? (slug(track.name) || 'track')
  for (let n = 2; !track.id && ids.has(id); n++) {
    id = `${slug(track.name) || 'track'}-${n}`
  }
  ids.add(id)
  return {
    ...(withRow(rest, query) as Omit<ColumnTrackSpec, 'id' | 'kind'>),
    id,
    kind: kindOf(track),
    ...(pad && track.values
      ? { values: [...Array<number>(pad).fill(0), ...track.values] }
      : {}),
    ...(pad && track.data !== undefined
      ? { data: ' '.repeat(pad) + track.data }
      : {}),
  }
}

function isInlineMsa(msa: string) {
  return msa.includes('\n')
}

function isInlineTree(tree: string) {
  return tree.trimStart().startsWith('(')
}

function uri(location: string) {
  return { uri: location, locationType: 'UriLocation' as const }
}

/**
 * Expand the short forms of an MsaView spec into the snapshot the model takes.
 * Idempotent, and a no-op on a spec that uses none of them.
 */
export function expandSpec(spec: MsaSpec): Record<string, unknown> {
  const { query, msa, tree, highlights, region, columnTracks, ...rest } = spec
  const data = {
    ...(rest.data as Record<string, unknown> | undefined),
    ...(msa !== undefined && isInlineMsa(msa) ? { msa } : {}),
    ...(tree !== undefined && isInlineTree(tree) ? { tree } : {}),
  }
  const ids = new Set(
    (columnTracks ?? []).map(t => t.id).filter(id => id !== undefined),
  )
  return {
    ...rest,
    ...(msa !== undefined && !isInlineMsa(msa)
      ? { msaFilehandle: uri(msa) }
      : {}),
    ...(tree !== undefined && !isInlineTree(tree)
      ? { treeFilehandle: uri(tree) }
      : {}),
    ...(Object.keys(data).length > 0 ? { data } : {}),
    ...(query !== undefined && rest.relativeTo === undefined
      ? { relativeTo: query }
      : {}),
    ...(highlights
      ? { highlights: highlights.map(h => expandHighlight(h, query)) }
      : {}),
    ...(region === undefined ? {} : { region: expandRegion(region, query) }),
    ...(columnTracks
      ? { columnTracks: columnTracks.map(t => expandTrack(t, query, ids)) }
      : {}),
  }
}

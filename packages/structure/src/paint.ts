import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'
import { schemeResidueColor } from 'react-msaview'

import { componentsOfStructure, residueLoci } from './molstar.ts'

import type { Molstar, PolymerResidue } from './molstar.ts'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'
import type { ColumnTrackSpec, Highlight, MsaViewModel } from 'react-msaview'

extend([namesPlugin])

/**
 * What paints a structure's residues: the column's conservation, the color the
 * alignment gives the residue, or `track:<id>`, the value a column track holds
 * at the residue's column
 */
export type StructureColor =
  'none' | 'conservation' | 'scheme' | `track:${string}`

export const conservationRamp = [
  '#86b6ef',
  '#5598e7',
  '#2a78d6',
  '#1c5cab',
  '#104281',
]
export const noColumnColor = '#c9c9c4'

export type ChainResidues = [chain: string, labelSeqIds: number[]][]
export type PaintGroup = [color: string, chains: ChainResidues]

/**
 * Maps a structure's residues to the row residues they correspond to, reading
 * each mapping's `asymIdKind`. A mapping with no kind reads its chain as a
 * label id when one of `residues` carries that label, and as an author id
 * otherwise, so one mapping never lights a chain in each id space. The kinds
 * are settled once here, since a paint asks for every residue.
 */
export function rowResidueLookup(
  model: MsaViewModel,
  structureId: string,
  residues: PolymerResidue[],
) {
  const labels = new Set(residues.map(r => r.labelAsymId))
  const kinds = new Set(
    model.mappedStructures
      .filter(m => m.structure.id === structureId)
      .map(
        ({ structure: { asymId, asymIdKind } }) =>
          asymIdKind ??
          (asymId === undefined || labels.has(asymId) ? 'label' : 'auth'),
      ),
  )
  const byLabel = kinds.has('label')
  const byAuth = kinds.has('auth')
  return ({ labelSeqId, labelAsymId, authAsymId }: PolymerResidue) =>
    (byLabel
      ? model.rowResidue(structureId, labelSeqId, labelAsymId)
      : undefined) ??
    (byAuth ? model.rowResidue(structureId, labelSeqId, authAsymId) : undefined)
}

function rampColor(value: number | undefined) {
  return value === undefined
    ? undefined
    : conservationRamp[
        Math.min(
          conservationRamp.length - 1,
          Math.floor(value * conservationRamp.length),
        )
      ]
}

/**
 * The column tracks a structure can be painted from: a bar track, through the
 * ramp, and a text track whose letters a color scale names
 */
export function paintableTracks(model: MsaViewModel): ColumnTrackSpec[] {
  return model.columnTracks.filter(
    t => t.kind === 'bar' || (t.kind === 'text' && t.encoding?.color),
  )
}

/** the `colorBy` that paints a structure from `track` */
export function trackColorBy(track: ColumnTrackSpec) {
  return `track:${track.id}` as const
}

/**
 * A track's color at each visible column, read the way the track draws: a text
 * letter through its scale in upper case, and nothing where the track's own row
 * has a gap, which the track fills with a zero or a blank. The row is looked up
 * in the alignment, so it need not be drawn.
 */
function trackColumnColor(model: MsaViewModel, track: ColumnTrackSpec) {
  const content = model.columnTrackContent.get(track.id)
  const { row } = track
  const colorOf =
    track.kind === 'bar'
      ? (col: number) => rampColor(content?.values?.[col])
      : letterColor(model, track, content?.data)
  return (col: number) =>
    row && model.visibleColToSeqPos(row, col) === undefined
      ? undefined
      : colorOf(col)
}

function letterColor(
  model: MsaViewModel,
  track: ColumnTrackSpec,
  data: string | undefined,
) {
  const hexes = new Map(
    Object.entries(
      model.columnTrackModel(track).model.customColorScheme ?? {},
    ).map(([letter, css]) => [letter, cssHex(css)]),
  )
  return (col: number) => hexes.get(data?.[col]?.toUpperCase() ?? '')
}

/**
 * The color `colorBy` gives a row residue, or undefined where it gives none,
 * such as a gap column or a column a track leaves blank
 */
export function residueColor(
  model: MsaViewModel,
  colorBy: Exclude<StructureColor, 'none'>,
) {
  if (colorBy === 'scheme') {
    return schemeResidueColor(model)
  } else {
    const track =
      colorBy === 'conservation'
        ? undefined
        : model.columnTracks.find(t => trackColorBy(t) === colorBy)
    const columnColor =
      colorBy === 'conservation'
        ? (col: number) => rampColor(model.conservation[col])
        : track
          ? trackColumnColor(model, track)
          : () => undefined
    return (rowName: string, seqPos: number) => {
      const col = model.seqPosToVisibleCol(rowName, seqPos - 1)
      return col === undefined ? undefined : columnColor(col)
    }
  }
}

/**
 * Groups a structure's polymer residues by the color the alignment gives the
 * row residue each maps to, one group per color so a scheme of many shades
 * costs one overpaint call each. A residue no row maps to, or one the scheme
 * leaves uncolored, takes the grey. Groups are sorted so two equal paints
 * compare equal.
 */
export function paintGroups(
  model: MsaViewModel,
  structureId: string,
  residues: PolymerResidue[],
  colorOf: (rowName: string, seqPos: number) => string | undefined,
): PaintGroup[] {
  const groups = new Map<string, Map<string, number[]>>()
  const rowResidueOf = rowResidueLookup(model, structureId, residues)
  for (const residue of residues) {
    const { labelAsymId, labelSeqId } = residue
    const hit = rowResidueOf(residue)
    const color = (hit && colorOf(hit.rowName, hit.seqPos)) ?? noColumnColor
    const chains = groups.get(color) ?? new Map<string, number[]>()
    const ids = chains.get(labelAsymId) ?? []
    ids.push(labelSeqId)
    chains.set(labelAsymId, ids)
    groups.set(color, chains)
  }
  return [...groups]
    .map(([color, chains]): PaintGroup => [color, [...chains]])
    .toSorted(([a], [b]) => a.localeCompare(b))
}

const highlightDefault = '#ff8c00'

/**
 * A CSS color as the opaque hex Mol* paints with, alpha dropped, or undefined
 * when it is not one or is fully transparent
 */
export function cssHex(css: string | undefined) {
  const color = css === undefined ? undefined : colord(css)
  return color?.isValid() && color.alpha() > 0
    ? color.alpha(1).toHex()
    : undefined
}

/** a highlight's CSS color as Mol* paints it, orange when it has none */
export function solidHex(css: string | undefined) {
  return cssHex(css) ?? highlightDefault
}

function highlightCovers(
  model: MsaViewModel,
  { row, rows, start, end }: Highlight,
  { rowName, seqPos }: { rowName: string; seqPos: number },
) {
  if (rows) {
    return rows.includes(rowName)
  } else if (start === undefined || end === undefined) {
    return false
  } else if (row === undefined) {
    const column = model.seqPosToGlobalCol(rowName, seqPos - 1)
    return column !== undefined && column + 1 >= start && column + 1 <= end
  } else {
    return row === rowName && seqPos >= start && seqPos <= end
  }
}

/**
 * The residues of a structure the alignment's `highlights` layer marks, one
 * group per highlight color, to overpaint on top of the base paint. A highlight
 * names residues of a row (`row`, `start`, `end`), file columns (`start`, `end`
 * alone) or whole rows (`rows`, which wins over `start` and `end` as it does in
 * the alignment), and each reaches the structure through the row residue its
 * residues map to, so a row that maps onto this structure is the only way in.
 * A later highlight wins where two overlap.
 */
export function highlightGroups(
  model: MsaViewModel,
  structureId: string,
  residues: PolymerResidue[],
): PaintGroup[] {
  const marks = model.highlights
  if (marks.length === 0) {
    return []
  }
  const byColor = new Map<string, Map<string, Set<number>>>()
  const rowResidueOf = rowResidueLookup(model, structureId, residues)
  for (const residue of residues) {
    const { labelAsymId, labelSeqId } = residue
    const hit = rowResidueOf(residue)
    if (!hit) {
      continue
    }
    let color: string | undefined
    for (const mark of marks) {
      if (highlightCovers(model, mark, hit)) {
        color = solidHex(mark.color)
      }
    }
    if (color !== undefined) {
      const chains = byColor.get(color) ?? new Map<string, Set<number>>()
      const ids = chains.get(labelAsymId) ?? new Set<number>()
      ids.add(labelSeqId)
      chains.set(labelAsymId, ids)
      byColor.set(color, chains)
    }
  }
  return [...byColor]
    .map(([color, chains]): PaintGroup => [
      color,
      [...chains].map(([chain, ids]) => [chain, [...ids]]),
    ])
    .toSorted(([a], [b]) => a.localeCompare(b))
}

const unmappedColor = '#d9d9d4'

/**
 * The structure in one color where the alignment covers it, and pale where it
 * does not, so a disordered tail or an unaligned domain recedes behind the part
 * the alignment compares. `color` goes to the residues a row maps onto.
 */
export function solidMappedGroups(
  model: MsaViewModel,
  structureId: string,
  residues: PolymerResidue[],
  color: string,
): PaintGroup[] {
  return paintGroups(model, structureId, residues, () => color).map(
    ([group, chains]): PaintGroup => [
      group === noColumnColor ? unmappedColor : group,
      chains,
    ],
  )
}

/** the polymer residues a row maps onto, to frame a view on */
export function mappedResidues(
  model: MsaViewModel,
  structureId: string,
  residues: PolymerResidue[],
) {
  const rowResidueOf = rowResidueLookup(model, structureId, residues)
  return residues.filter(r => rowResidueOf(r) !== undefined)
}

/**
 * Overpaints one loaded structure, found by its root state ref, clearing its
 * earlier paint first.
 */
export async function paintStructure(
  plugin: PluginUIContext,
  molstar: Molstar,
  groups: PaintGroup[],
  ref: string,
) {
  const components = await componentsOfStructure(plugin, ref)
  await molstar.clearStructureOverpaint(plugin, components)
  for (const [color, chains] of groups) {
    await molstar.setStructureOverpaint(
      plugin,
      components,
      molstar.Color.fromHexStyle(color),
      structure =>
        Promise.resolve(
          chains
            .map(([chain, ids]) =>
              residueLoci(molstar, structure, ids, chain, 'label'),
            )
            .reduce((a, b) => molstar.StructureElement.Loci.union(a, b)),
        ),
    )
  }
}

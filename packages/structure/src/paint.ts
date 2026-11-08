import { componentsOfStructure, residueLoci } from './molstar.ts'

import type { Molstar, PolymerResidue } from './molstar.ts'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'
import type { Highlight, MsaViewModel } from 'react-msaview'

export type StructureColor = 'none' | 'conservation' | 'scheme'

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

export function conservationColor(
  model: MsaViewModel,
  rowName: string,
  seqPos: number,
) {
  const col = model.seqPosToVisibleCol(rowName, seqPos - 1)
  const value = col === undefined ? undefined : model.conservation[col]
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

/** a CSS color as the opaque hex Mol* paints with; alpha is dropped */
export function solidHex(css: string | undefined) {
  if (!css) {
    return highlightDefault
  }
  const hex = /^#([0-9a-f]{6})\b/i.exec(css.trim())
  if (hex) {
    return `#${hex[1]!.toLowerCase()}`
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(css.trim())
  if (short) {
    return `#${short[1]!}${short[1]!}${short[2]!}${short[2]!}${short[3]!}${short[3]!}`.toLowerCase()
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(css.trim())
  if (rgb) {
    return `#${[rgb[1], rgb[2], rgb[3]]
      .map(v => Math.min(255, Number(v)).toString(16).padStart(2, '0'))
      .join('')}`
  }
  return highlightDefault
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

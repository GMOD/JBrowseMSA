import {
  meanColumnDistances,
  superposeOnColumns,
} from './alignmentSuperposition.ts'
import { caChain, parseCaCoordinates } from './cif.ts'

import type {
  RowCoordinates,
  RowSuperposition,
} from './alignmentSuperposition.ts'
import type { CaCoordinates, Vec3 } from './cif.ts'
import type { Mat4 } from './superpose.ts'
import type { ColumnTrackSpec, MsaViewModel } from 'react-msaview'

export interface SuperposeTarget {
  row: string
  structureId: string
}

export interface SuperposeRowsResult {
  /** the structure that stays put, and the matrix for each of the others */
  referenceId: string
  /** the row whose residues `distanceValues` follows */
  referenceRow: string
  matrices: Record<string, Mat4>
  fits: (RowSuperposition & { structureId: string })[]
  /** CA distance per residue of the reference row, a `columnTracks` bar */
  distanceValues: number[]
  /** rows left out, and why */
  skipped: { row: string; reason: string }[]
}

export type FetchText = (url: string) => Promise<string>

const fetchText: FetchText = async url => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status}`)
  }
  return res.text()
}

/**
 * A row's CA positions by file column, 0-based: each residue goes through
 * `structureResidue` to its `label_seq_id`, then to the CA the mapping's chain
 * holds there. A residue with no mapping or no CA joins no fit.
 */
function rowCoordinates(
  model: MsaViewModel,
  row: string,
  structureId: string,
  coordinates: CaCoordinates,
): RowCoordinates {
  const atColumn = new Map<number, Vec3>()
  const structure = model.mappedStructures.find(
    m => m.row === row && m.structure.id === structureId,
  )?.structure
  const chain =
    structure && caChain(coordinates, structure.asymId, structure.asymIdKind)
  const columns = model.seqPosIndex(row)
  if (chain && columns) {
    columns.forEach((column, i) => {
      const position = model.structureResidue(row, i + 1, structureId)?.position
      const ca = position === undefined ? undefined : chain.get(position)
      if (ca) {
        atColumn.set(column, ca)
      }
    })
  }
  return { row, atColumn }
}

/**
 * Superposes the structures of several rows by the alignment. The first target
 * is the reference. Each other row's structure is fitted on the columns where
 * both rows have a CA, limited to `columns` when given, and the CA distance per
 * residue of the reference row comes back as the values of a bar track.
 *
 * Structure files are read as mmCIF or PDB format. A row whose file cannot be
 * fetched or holds no CA is skipped with a reason, as is a row that shares a
 * structure with the reference; the reference failing throws.
 */
export async function superposeRows({
  model,
  targets,
  columns,
  refine,
  fetchText: read = fetchText,
}: {
  model: MsaViewModel
  targets: SuperposeTarget[]
  /** file columns, 0-based, inclusive; every column when unset */
  columns?: { start: number; end: number }
  /** set aside poorly fitting pairs and fit again; on by default */
  refine?: false
  fetchText?: FetchText
}): Promise<SuperposeRowsResult> {
  const [reference, ...rest] = targets
  if (!reference) {
    throw new Error('Pick at least two rows that map onto structures')
  }
  const cache = new Map<string, Promise<CaCoordinates>>()
  const coordinatesOf = (structureId: string) => {
    const url = model.mappedStructures.find(m => m.structure.id === structureId)
      ?.structure.url
    if (!url) {
      return Promise.reject(new Error(`${structureId} has no file to read`))
    }
    let found = cache.get(url)
    if (!found) {
      found = read(url).then(text => {
        const parsed = parseCaCoordinates(text)
        if (!parsed) {
          throw new Error(`${structureId} holds no CA atoms the page can read`)
        }
        return parsed
      })
      cache.set(url, found)
    }
    return found
  }

  const skipped: SuperposeRowsResult['skipped'] = []
  const referenceRow = rowCoordinates(
    model,
    reference.row,
    reference.structureId,
    await coordinatesOf(reference.structureId),
  )

  const others: RowCoordinates[] = []
  const seen = new Set([reference.structureId])
  for (const target of rest) {
    if (seen.has(target.structureId)) {
      skipped.push({
        row: target.row,
        reason: `${target.structureId} is already in the superposition`,
      })
      continue
    }
    let coordinates
    try {
      coordinates = await coordinatesOf(target.structureId)
    } catch (e) {
      skipped.push({
        row: target.row,
        reason: e instanceof Error ? e.message : String(e),
      })
      continue
    }
    seen.add(target.structureId)
    others.push({
      ...rowCoordinates(model, target.row, target.structureId, coordinates),
      id: target.structureId,
    })
  }

  const result = superposeOnColumns(
    referenceRow,
    others,
    column =>
      columns === undefined ||
      (column >= columns.start && column <= columns.end),
    refine === false ? false : undefined,
  )
  const fits = result.fits.map(fit => ({
    ...fit,
    structureId: fit.id!,
  }))
  const matrices: Record<string, Mat4> = {}
  for (const fit of fits) {
    matrices[fit.structureId] = fit.matrix
  }
  return {
    referenceId: reference.structureId,
    referenceRow: reference.row,
    matrices,
    fits,
    distanceValues: meanColumnDistances(
      fits,
      Array.from(model.seqPosIndex(reference.row) ?? []),
    ),
    skipped: [...skipped, ...result.skipped],
  }
}

/**
 * The CA distances of a superposition as a `columnTracks` bar on the reference
 * row, scaled to the largest distance rounded up, since a bar's `max` is 1 by
 * default and the distances are in Å.
 */
export function distanceTrack(
  result: SuperposeRowsResult,
  id = 'ca-distance',
): ColumnTrackSpec {
  const max = Math.ceil(
    Math.max(1, ...result.distanceValues.filter(Number.isFinite)),
  )
  return {
    id,
    name: `CA distance to ${result.referenceRow} (0–${max} Å)`,
    kind: 'bar',
    row: result.referenceRow,
    values: result.distanceValues,
    encoding: { y: { domainMax: max } },
    color: '#d55e00',
    height: 60,
  }
}

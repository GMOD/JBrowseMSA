import type { RowCoordinates } from './types.ts'

/** the position a 1-based residue of the row holds in its coordinates */
export function coordinateOf(
  coordinates: RowCoordinates | undefined,
  residue: number,
) {
  return coordinates ? coordinates.start + residue - 1 : residue
}

/** the 1-based residue of the row at a position in its coordinates */
export function residueAt(
  coordinates: RowCoordinates | undefined,
  position: number,
) {
  return coordinates ? position - coordinates.start + 1 : position
}

/**
 * A position as the ruler prints it: with thousands separators in a row's
 * coordinates, and as a bare residue number without them
 */
export function formatPosition(
  coordinates: RowCoordinates | undefined,
  residue: number,
) {
  const position = coordinateOf(coordinates, residue)
  return coordinates ? position.toLocaleString('en-US') : `${position}`
}

/**
 * `row:residue` without coordinates, and `name:position` with them, the name
 * falling back on the row's own
 */
export function positionLabel(
  row: string,
  coordinates: RowCoordinates | undefined,
  residue: number,
) {
  return `${coordinates?.name ?? row}:${formatPosition(coordinates, residue)}`
}

/** a typed position, with or without thousands separators, or undefined */
export function parsePosition(text: string) {
  return /^\d{1,3}(?:,\d{3})+$|^\d+$/.test(text)
    ? Number(text.replaceAll(',', ''))
    : undefined
}

/** each row's record, the last one naming it where several do */
export function coordinatesByRow(records: readonly RowCoordinates[]) {
  return new Map(records.map(record => [record.row, record]))
}

import { parsePosition } from '../../rowCoordinates.ts'

import type { MsaViewModel } from '../../model.ts'

export function findableRowNames(model: MsaViewModel) {
  const collapsed = new Set(model.collapsed)
  return model.leaves
    .filter(({ data: { id, name } }) => !(collapsed.has(id) && name === id))
    .map(leaf => leaf.data.name)
}

// not MUI's createFilterOptions: JBrowse hosts do not re-export it, so
// jbrowse-plugin-msaview would fail to load
export function rowNameSuggestions(names: string[], input: string, limit = 50) {
  const query = input.toLowerCase()
  return names
    .filter(name => name.toLowerCase().includes(query))
    .slice(0, limit)
}

/**
 * The visible row and column a "Go to" entry names: a row by its name, the
 * column the ruler numbers N, or position N of a row written `name:N`. A row
 * with `rowCoordinates` reads N in them, and the coordinates' own name
 * (`chrX:146,993,540`) names the `relativeTo` row first, then any other row
 * carrying it. A name is tried whole first, so a row called `chr1:100` stays
 * reachable.
 */
function resolveGoTo(model: MsaViewModel, text: string) {
  const query = text.trim()
  const row = model.rowNamesSet.get(query)
  if (row !== undefined) {
    return { row }
  }
  const named = /^(.+):([\d,]+)$/.exec(query)
  if (named) {
    const [, name = '', digits = ''] = named
    const position = parsePosition(digits)
    const rowName = rowNamed(model, name)
    const rowIndex =
      rowName === undefined ? undefined : model.rowNamesSet.get(rowName)
    const col =
      rowName === undefined || position === undefined
        ? undefined
        : columnOfPosition(model, rowName, position)
    return rowIndex === undefined || col === undefined
      ? undefined
      : { row: rowIndex, col }
  }
  const n = parsePosition(query)
  if (n !== undefined) {
    const { relativeTo, MSA } = model
    const col = relativeTo
      ? columnOfPosition(model, relativeTo, n)
      : n >= 1 && n <= (MSA?.getWidth() ?? 0)
        ? model.globalColToVisibleCol(n - 1)
        : undefined
    return col === undefined ? undefined : { col }
  }
  return undefined
}

// a row by its own name, or by the name of the coordinates it carries
function rowNamed(model: MsaViewModel, name: string) {
  const { relativeTo, rowNamesSet, rowCoordinatesByRow } = model
  const carriers = [...rowCoordinatesByRow.values()]
    .filter(record => record.name === name && rowNamesSet.has(record.row))
    .map(record => record.row)
  return rowNamesSet.has(name)
    ? name
    : relativeTo !== undefined && carriers.includes(relativeTo)
      ? relativeTo
      : carriers[0]
}

function columnOfPosition(model: MsaViewModel, name: string, position: number) {
  return columnOfResidue(model, name, model.residueAtPosition(name, position))
}

// seqPosToVisibleCol maps a residue past the row's end to the column after
// it; here that residue names nothing
function columnOfResidue(model: MsaViewModel, name: string, pos: number) {
  const globalCol = model.seqPosIndex(name)?.[pos - 1]
  return globalCol === undefined
    ? undefined
    : model.globalColToVisibleCol(globalCol)
}

/** centers the view on the entry's target and lights it; false if none */
export function goTo(model: MsaViewModel, text: string) {
  const target = resolveGoTo(model, text)
  if (target) {
    const { row, col } = target
    const { rowHeight, colWidth, msaAreaHeight, msaAreaWidth } = model
    if (row !== undefined) {
      model.setScrollY(-(row + 0.5) * rowHeight + msaAreaHeight / 2)
    }
    if (col !== undefined) {
      model.setScrollX(-(col + 0.5) * colWidth + msaAreaWidth / 2)
    }
    model.setMousePos(col, row)
  }
  return target !== undefined
}

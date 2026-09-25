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
 * column the ruler numbers N, or residue N of a row written `name:N`. A name
 * is tried whole first, so a row called `chr1:100` stays reachable.
 */
export function resolveGoTo(model: MsaViewModel, text: string) {
  const query = text.trim()
  const row = model.rowNamesSet.get(query)
  if (row !== undefined) {
    return { row }
  }
  const residue = /^(.+):(\d+)$/.exec(query)
  if (residue) {
    const [, name = '', pos] = residue
    const rowIndex = model.rowNamesSet.get(name)
    const col =
      rowIndex === undefined ? undefined : columnOfResidue(model, name, +pos!)
    return col === undefined ? undefined : { row: rowIndex, col }
  }
  if (/^\d+$/.test(query)) {
    const n = +query
    const { relativeTo, numColumns } = model
    const col = relativeTo
      ? columnOfResidue(model, relativeTo, n)
      : n >= 1 && n <= numColumns
        ? n - 1
        : undefined
    return col === undefined ? undefined : { col }
  }
  return undefined
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

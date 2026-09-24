import type { MsaViewModel } from '../../model.ts'

export function findableRowNames(model: MsaViewModel) {
  const collapsed = new Set(model.collapsed)
  return model.leaves
    .filter(({ data: { id, name } }) => !(collapsed.has(id) && name === id))
    .map(leaf => leaf.data.name)
}

export function revealRow(model: MsaViewModel, name: string) {
  const index = model.rowNamesSet.get(name)
  if (index !== undefined) {
    const { rowHeight, msaAreaHeight } = model
    model.setScrollY(-(index + 0.5) * rowHeight + msaAreaHeight / 2)
    model.setMousePos(undefined, index)
  }
}

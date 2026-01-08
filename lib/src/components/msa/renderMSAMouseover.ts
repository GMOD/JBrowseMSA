import type { MsaViewModel } from '../../model'

const hoverColor = 'rgba(0,0,0,0.15)'
const highlightColor = 'rgba(128,128,0,0.2)'
const referenceColor = 'rgba(0,128,255,0.3)' // Blue highlight for reference row
const multiRowHoverColor = 'rgba(255,165,0,0.15)' // Orange highlight for multi-row tree hover

export function renderMouseover({
  ctx,
  model,
}: {
  ctx: CanvasRenderingContext2D
  model: MsaViewModel
}) {
  const {
    mouseCol,
    colWidth,
    width,
    height,
    rowHeight,
    scrollX,
    scrollY,
    mouseRow,
    // @ts-expect-error
    mouseCol2,
    mouseClickRow,
    mouseClickCol,
    relativeTo,
    rowNamesSet,
    hoveredTreeNode,
    highlightedColumns,
  } = model
  ctx.resetTransform()
  ctx.clearRect(0, 0, width, height)

  // Highlight reference row (relativeTo) persistently
  if (relativeTo) {
    const referenceRowIndex = rowNamesSet.get(relativeTo)
    if (referenceRowIndex !== undefined) {
      ctx.fillStyle = referenceColor
      ctx.fillRect(0, referenceRowIndex * rowHeight + scrollY, width, rowHeight)
    }
  }

  // Highlight multiple rows when hovering over tree nodes with children
  if (hoveredTreeNode) {
    ctx.fillStyle = multiRowHoverColor
    for (const descendantName of hoveredTreeNode.descendantNames) {
      const rowIndex = rowNamesSet.get(descendantName)
      if (rowIndex !== undefined) {
        ctx.fillRect(0, rowIndex * rowHeight + scrollY, width, rowHeight)
      }
    }
  }

  // Highlight multiple columns
  if (highlightedColumns?.length) {
    ctx.fillStyle = highlightColor
    for (const col of highlightedColumns) {
      ctx.fillRect(col * colWidth + scrollX, 0, colWidth, height)
    }
  }

  if (mouseCol !== undefined) {
    ctx.fillStyle = hoverColor
    ctx.fillRect(mouseCol * colWidth + scrollX, 0, colWidth, height)
  }
  if (mouseRow !== undefined) {
    ctx.fillStyle = hoverColor
    ctx.fillRect(0, mouseRow * rowHeight + scrollY, width, rowHeight)
  }
  if (mouseClickCol !== undefined) {
    ctx.fillStyle = highlightColor
    ctx.fillRect(mouseClickCol * colWidth + scrollX, 0, colWidth, height)
  }
  if (mouseClickRow !== undefined) {
    ctx.fillStyle = highlightColor
    ctx.fillRect(0, mouseClickRow * rowHeight + scrollY, width, rowHeight)
  }
  if (mouseCol2 !== undefined) {
    ctx.fillStyle = highlightColor
    ctx.fillRect(mouseCol2 * colWidth + scrollX, 0, colWidth, height)
  }
}

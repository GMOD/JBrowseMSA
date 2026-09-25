import type { MsaViewModel } from '../../model.ts'

export function onMsaKey(
  model: MsaViewModel,
  { key, shiftKey }: { key: string; shiftKey: boolean },
) {
  const { colWidth, rowHeight, msaCanvasWidth, msaAreaHeight } = model
  const dx = shiftKey ? msaCanvasWidth : colWidth
  const dy = shiftKey ? msaAreaHeight : rowHeight
  switch (key) {
    case 'ArrowLeft':
      model.doScrollX(dx)
      return true
    case 'ArrowRight':
      model.doScrollX(-dx)
      return true
    case 'ArrowUp':
      model.doScrollY(dy)
      return true
    case 'ArrowDown':
      model.doScrollY(-dy)
      return true
    case '+':
    case '=':
      model.zoomIn()
      return true
    case '-':
      model.zoomOut()
      return true
    case 'Home':
      model.setScrollX(0)
      return true
    case 'End':
      model.setScrollX(model.maxScrollX)
      return true
    case 'Escape':
      if (model.selection) {
        model.clearSelection()
        return true
      }
      return false
    default:
      return false
  }
}

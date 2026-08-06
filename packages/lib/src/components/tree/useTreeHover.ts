import { useRef, useState } from 'react'

import { ClickMapIndex } from './clickMap.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ClickEntry } from './clickMap.ts'
import type React from 'react'

export interface TreeHoverTarget extends ClickEntry {
  clientX: number
  clientY: number
}

/**
 * Owns hit-testing for one tree block: the spatial index the render pass fills
 * in, the entry currently under the pointer, and the model hover state that the
 * MSA panel mirrors. The index is a render artifact rather than display state, so
 * it lives in a ref; everything the component draws comes back as plain state.
 */
export function useTreeHover({
  model,
  offsetY,
}: {
  model: MsaViewModel
  offsetY: number
}) {
  const clickMapRef = useRef<ClickMapIndex>(null)
  clickMapRef.current ??= new ClickMapIndex()
  const clickMap = clickMapRef.current
  const [hovered, setHovered] = useState<TreeHoverTarget>()

  // leaf labels win over the branch/bubble targets they overlap, so a click on a
  // name opens the node menu rather than the branch menu
  function hitTest(event: React.MouseEvent) {
    const x = event.nativeEvent.offsetX
    const y = event.nativeEvent.offsetY + offsetY
    const entries = clickMap.search({
      minX: x,
      maxX: x + 1,
      minY: y,
      maxY: y + 1,
    })
    return entries.find(entry => !entry.branch) ?? entries[0]
  }

  function onMouseMove(event: React.MouseEvent) {
    const entry = hitTest(event)
    setHovered(
      entry
        ? { ...entry, clientX: event.clientX, clientY: event.clientY }
        : undefined,
    )
    // hovering an internal node highlights every tip below it; hovering a leaf
    // label additionally drives the single-row highlight
    model.setHoveredTreeNode(entry?.id)
    model.setMousePos(
      undefined,
      entry && !entry.branch ? model.rowNamesSet.get(entry.name) : undefined,
    )
  }

  function onMouseLeave() {
    setHovered(undefined)
    model.setHoveredTreeNode(undefined)
    model.setMousePos(undefined, undefined)
  }

  return { clickMap, hovered, hitTest, onMouseMove, onMouseLeave }
}

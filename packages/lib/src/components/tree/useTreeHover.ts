import { useState } from 'react'

import { useHoverAnchor } from '../useHoverAnchor.ts'
import { ClickMapIndex } from './clickMap.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ClickEntry } from './clickMap.ts'
import type React from 'react'

/**
 * Owns hit-testing for one tree block: the spatial index the render pass fills
 * in, the entry under the pointer with its tooltip anchor, and the model hover
 * state that the MSA panel mirrors.
 */
export function useTreeHover({
  model,
  offsetY,
}: {
  model: MsaViewModel
  offsetY: number
}) {
  const [clickMap] = useState(() => new ClickMapIndex())
  const { anchor, hoverAt, clearAnchor } = useHoverAnchor<ClickEntry>()

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
    hoverAt(event, entry)
    // hovering an internal node highlights every tip below it; hovering a leaf
    // label additionally drives the single-row highlight
    model.setHoveredTreeNode(entry?.id)
    model.setMousePos(
      undefined,
      entry && !entry.branch ? model.rowNamesSet.get(entry.name) : undefined,
    )
  }

  function onMouseLeave() {
    clearAnchor()
    model.setHoveredTreeNode(undefined)
    model.setMousePos(undefined, undefined)
  }

  return { clickMap, anchor, hitTest, onMouseMove, onMouseLeave }
}

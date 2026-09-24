import { useState } from 'react'

export interface HoverAnchor<T> {
  clientPoint: { x: number; y: number }
  value: T
}

/**
 * The thing under the pointer and the point a tooltip about it hangs from,
 * 15px below the cursor so the tooltip clears it.
 */
export function useHoverAnchor<T>() {
  const [anchor, setAnchor] = useState<HoverAnchor<T>>()

  function hoverAt(
    event: { clientX: number; clientY: number },
    value: T | undefined,
  ) {
    setAnchor(
      value === undefined
        ? undefined
        : { value, clientPoint: { x: event.clientX, y: event.clientY + 15 } },
    )
  }

  function clearAnchor() {
    setAnchor(undefined)
  }

  return { anchor, hoverAt, clearAnchor }
}

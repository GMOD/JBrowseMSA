import { useEffect, useRef, useState } from 'react'

/**
 * Tracks a pointer drag along a single axis and reports the scroll delta on
 * each animation frame. Shared by the horizontal Minimap, the VerticalScrollbar
 * and the dividers.
 *
 * `onScroll` is invoked with the pixel delta since drag start and the scroll
 * offset captured when the drag began. Memoize it (useCallback) so the document
 * listeners are not re-attached on every render.
 */
export function useDragScroll(
  axis: 'x' | 'y',
  onScroll: (delta: number, startScroll: number) => void,
) {
  const scheduled = useRef(false)
  const [mouseDown, setMouseDown] = useState<{
    client: number
    startScroll: number
  }>()

  useEffect(() => {
    if (mouseDown !== undefined) {
      const { client: startClient, startScroll } = mouseDown
      function onMove(event: PointerEvent) {
        if (!scheduled.current) {
          scheduled.current = true
          requestAnimationFrame(() => {
            const client = axis === 'x' ? event.clientX : event.clientY
            onScroll(client - startClient, startScroll)
            scheduled.current = false
          })
        }
      }
      function onUp() {
        setMouseDown(undefined)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onUp)
      return () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onUp)
      }
    }
    return undefined
  }, [axis, onScroll, mouseDown])

  return {
    dragging: mouseDown !== undefined,
    startDrag: (event: React.PointerEvent, startScroll: number) => {
      setMouseDown({
        client: axis === 'x' ? event.clientX : event.clientY,
        startScroll,
      })
    },
  }
}

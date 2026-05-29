import { useEffect, useRef, useState } from 'react'

/**
 * Tracks a mouse drag along a single axis and reports the scroll delta on each
 * animation frame. Shared by the horizontal Minimap and the VerticalScrollbar.
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
      function onMove(event: MouseEvent) {
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
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      return () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
    }
  }, [axis, onScroll, mouseDown])

  return {
    dragging: mouseDown !== undefined,
    startDrag: (event: React.MouseEvent, startScroll: number) => {
      setMouseDown({
        client: axis === 'x' ? event.clientX : event.clientY,
        startScroll,
      })
    },
  }
}

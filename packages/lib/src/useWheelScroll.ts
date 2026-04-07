import { useEffect, useRef, useState } from 'react'

export function useWheelScroll({
  ref,
  onScrollX,
  onScrollY,
}: {
  ref: React.RefObject<HTMLDivElement | null>
  onScrollX?: (delta: number) => void
  onScrollY?: (delta: number) => void
}) {
  const scheduled = useRef(false)
  const deltaX = useRef(0)
  const deltaY = useRef(0)
  const prevX = useRef(0)
  const prevY = useRef(0)
  const [mouseDragging, setMouseDragging] = useState(false)

  useEffect(() => {
    const curr = ref.current
    if (!curr) {
      return
    }
    function onWheel(event: WheelEvent) {
      if (onScrollX) {
        deltaX.current += event.deltaX
      }
      if (onScrollY) {
        deltaY.current += event.deltaY
      }

      if (!scheduled.current) {
        scheduled.current = true
        requestAnimationFrame(() => {
          if (onScrollX) {
            onScrollX(-deltaX.current)
            deltaX.current = 0
          }
          if (onScrollY) {
            onScrollY(-deltaY.current)
            deltaY.current = 0
          }
          scheduled.current = false
        })
      }
      event.preventDefault()
      event.stopPropagation()
    }
    curr.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      curr.removeEventListener('wheel', onWheel)
    }
  }, [ref, onScrollX, onScrollY])

  useEffect(() => {
    if (!mouseDragging) {
      return
    }
    function globalMouseMove(event: MouseEvent) {
      event.preventDefault()
      const distanceX = event.clientX - prevX.current
      const distanceY = event.clientY - prevY.current
      if ((distanceX && onScrollX) || (distanceY && onScrollY)) {
        if (!scheduled.current) {
          scheduled.current = true
          requestAnimationFrame(() => {
            onScrollX?.(distanceX)
            onScrollY?.(distanceY)
            scheduled.current = false
            prevX.current = event.clientX
            prevY.current = event.clientY
          })
        }
      }
    }

    function globalMouseUp() {
      prevX.current = 0
      prevY.current = 0
      setMouseDragging(false)
    }

    window.addEventListener('mousemove', globalMouseMove, true)
    window.addEventListener('mouseup', globalMouseUp, true)
    return () => {
      window.removeEventListener('mousemove', globalMouseMove, true)
      window.removeEventListener('mouseup', globalMouseUp, true)
    }
  }, [mouseDragging, onScrollX, onScrollY])

  function onMouseDown(event: React.MouseEvent) {
    const target = event.target as HTMLElement
    if (target.draggable || target.dataset.resizer) {
      return
    }
    if (event.button === 0) {
      prevX.current = event.clientX
      prevY.current = event.clientY
      setMouseDragging(true)
    }
  }

  function onMouseUp(event: React.MouseEvent) {
    event.preventDefault()
    setMouseDragging(false)
  }

  return { onMouseDown, onMouseUp }
}

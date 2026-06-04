import { useEffect, useRef, useState } from 'react'

import {
  SCROLL_ZOOM_DIVISOR,
  getZoomNormalizer,
  normalizeWheelDelta,
  zoomFactorFromAccum,
} from './wheelZoom.ts'

export function useWheelScroll({
  ref,
  onScrollX,
  onScrollY,
  onZoom,
  scrollZoom,
}: {
  ref: React.RefObject<HTMLDivElement | null>
  onScrollX?: (delta: number) => void
  onScrollY?: (delta: number) => void
  onZoom?: (scaleFactor: number, offsetX: number, offsetY: number) => void
  scrollZoom?: boolean
}) {
  const scheduled = useRef(false)
  const zoomScheduled = useRef(false)
  const deltaX = useRef(0)
  const deltaY = useRef(0)
  const zoomAccum = useRef(0)
  const zoomX = useRef(0)
  const zoomY = useRef(0)
  const lastZoomTime = useRef<number | null>(null)
  const prevX = useRef(0)
  const prevY = useRef(0)
  const [mouseDragging, setMouseDragging] = useState(false)

  useEffect(() => {
    const curr = ref.current
    if (!curr) {
      return
    }
    function onWheel(event: WheelEvent) {
      // ctrlKey is also set by trackpad pinch gestures on all platforms. when
      // scrollZoom is on, a plain vertical-dominant wheel zooms too; holding
      // shift is the escape hatch to pan instead.
      const isCtrlZoom = event.ctrlKey || event.metaKey
      const isScrollZoom =
        scrollZoom &&
        !event.shiftKey &&
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      if (onZoom && (isCtrlZoom || isScrollZoom)) {
        const rect = curr!.getBoundingClientRect()
        // normalize away deltaMode (line/page), then divide by an adaptive
        // factor so fine pinches and coarse notches feel consistent
        const dY = normalizeWheelDelta(event.deltaY, event.deltaMode)
        const divisor = isCtrlZoom ? getZoomNormalizer(dY) : SCROLL_ZOOM_DIVISOR
        zoomAccum.current += dY / divisor
        zoomX.current = event.clientX - rect.left
        zoomY.current = event.clientY - rect.top
        if (!zoomScheduled.current) {
          zoomScheduled.current = true
          requestAnimationFrame(now => {
            const elapsed =
              lastZoomTime.current === null ? 16.67 : now - lastZoomTime.current
            lastZoomTime.current = now
            onZoom(
              zoomFactorFromAccum(zoomAccum.current, Math.min(100, elapsed)),
              zoomX.current,
              zoomY.current,
            )
            zoomAccum.current = 0
            zoomScheduled.current = false
          })
        }
        event.preventDefault()
        event.stopPropagation()
        return
      }
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
  }, [ref, onScrollX, onScrollY, onZoom, scrollZoom])

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

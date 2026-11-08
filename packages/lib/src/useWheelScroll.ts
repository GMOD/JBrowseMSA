import { useEffect, useRef, useState } from 'react'

import { WheelZoomSmoother } from './wheelZoom.ts'

import type { MsaViewModel } from './model.ts'

const zoomSettleMs = 150

// a wheel event this soon after one the view took belongs to the same gesture,
// so the view keeps it at an edge rather than handing the momentum to the page
const wheelLatchMs = 150

type Axes = 'x' | 'y' | 'xy'

/**
 * Whether a vertical wheel `delta` moves a view at `scrollY`. At the top or
 * bottom, or when every row fits, the page scrolls instead, so an embedded
 * viewer never traps the reader scrolling past it.
 */
function canScrollY(model: MsaViewModel, delta: number) {
  const { scrollY, maxScrollY } = model
  return delta > 0 ? scrollY > maxScrollY : delta < 0 && scrollY < 0
}

// Safari reads a touch-action holding pinch-zoom as invalid and falls back to
// auto, which hands every swipe to the page
const pinchZoom =
  typeof CSS !== 'undefined' && CSS.supports('touch-action', 'pinch-zoom')
    ? 'pinch-zoom'
    : undefined

function withPinch(pan: string) {
  return pinchZoom ? `${pan} ${pinchZoom}` : pan
}

/**
 * The CSS touch-action for a pannable area: the browser keeps a touch pan
 * along every axis the view cannot scroll, and pinch zoom on the page where it
 * supports that value.
 */
function panTouchAction(model: MsaViewModel, axes: Axes) {
  const x = axes.includes('x') && model.maxScrollX < 0
  const y = axes.includes('y') && model.maxScrollY < 0
  return x && y
    ? (pinchZoom ?? 'none')
    : x
      ? withPinch('pan-y')
      : y
        ? withPinch('pan-x')
        : 'auto'
}

/**
 * Wheel scrolling, wheel zoom and pointer-drag panning of `model` over `ref`,
 * along `axes`. The returned `onPointerDown` starts a pan with a mouse, a pen
 * or a finger; put `touchAction` on the same element.
 */
export function useWheelScroll({
  ref,
  model,
  axes,
  zoom,
  onWheelScroll,
}: {
  ref: React.RefObject<HTMLDivElement | null>
  model: MsaViewModel
  axes: Axes
  zoom?: boolean
  onWheelScroll?: (event: WheelEvent) => void
}) {
  const scheduled = useRef(false)
  const zoomFrame = useRef<number | undefined>(undefined)
  const zoomSettle = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const deltaX = useRef(0)
  const deltaY = useRef(0)
  const lastTaken = useRef(Number.NEGATIVE_INFINITY)
  const zoomSmoother = useRef(new WheelZoomSmoother())
  const zoomX = useRef(0)
  const zoomY = useRef(0)
  const lastZoomTime = useRef<number | null>(null)
  const prev = useRef({ x: 0, y: 0 })
  const latest = useRef({ x: 0, y: 0 })
  const panFrame = useRef(false)
  // the pointer that started the pan; a second finger neither moves nor ends it
  const [panPointer, setPanPointer] = useState<number>()
  const x = axes.includes('x')
  const y = axes.includes('y')

  useEffect(() => {
    const curr = ref.current
    if (!curr) {
      return undefined
    }
    function onWheel(event: WheelEvent) {
      // ctrlKey is also set by trackpad pinch gestures on all platforms. when
      // scrollZoom is on, a plain vertical-dominant wheel zooms too; holding
      // shift is the escape hatch to pan instead.
      const isCtrlZoom = event.ctrlKey || event.metaKey
      const isScrollZoom =
        model.scrollZoom &&
        !event.shiftKey &&
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      if (zoom && (isCtrlZoom || isScrollZoom)) {
        const rect = curr!.getBoundingClientRect()
        zoomSmoother.current.add(event.deltaY, event.deltaMode, isCtrlZoom)
        zoomX.current = event.clientX - rect.left
        zoomY.current = event.clientY - rect.top
        if (zoomFrame.current === undefined) {
          lastZoomTime.current = null
          const frame = (now: number) => {
            const elapsed =
              lastZoomTime.current === null ? 16.67 : now - lastZoomTime.current
            lastZoomTime.current = now
            model.wheelZoomToPos(
              zoomSmoother.current.step(Math.min(100, elapsed)),
              zoomX.current,
              zoomY.current,
            )
            clearTimeout(zoomSettle.current)
            zoomSettle.current = setTimeout(() => {
              model.endWheelZoom()
            }, zoomSettleMs)
            zoomFrame.current = zoomSmoother.current.idle
              ? undefined
              : requestAnimationFrame(frame)
          }
          zoomFrame.current = requestAnimationFrame(frame)
        }
        event.preventDefault()
        event.stopPropagation()
        return
      }
      // the dominant axis decides: a trackpad's vertical swipe carries a pixel
      // or two of deltaX, which must not hold the page at the bottom row. A
      // horizontal wheel stays taken at the edges, where the page would read
      // it as a swipe back through history.
      const { deltaX: dx, deltaY: dy } = event
      const vertical = Math.abs(dy) >= Math.abs(dx)
      const latched = event.timeStamp - lastTaken.current < wheelLatchMs
      const takeY =
        y && dy !== 0 && (latched || canScrollY(model, dy) || !vertical)
      const takeX = x && dx !== 0 && (!vertical || takeY)
      if (takeX || takeY) {
        if (takeY && vertical) {
          lastTaken.current = event.timeStamp
        }
        onWheelScroll?.(event)
        deltaX.current += takeX ? event.deltaX : 0
        deltaY.current += takeY ? event.deltaY : 0
        if (!scheduled.current) {
          scheduled.current = true
          requestAnimationFrame(() => {
            model.doScrollX(-deltaX.current)
            model.doScrollY(-deltaY.current)
            deltaX.current = 0
            deltaY.current = 0
            scheduled.current = false
          })
        }
        event.preventDefault()
        event.stopPropagation()
      }
    }
    curr.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      curr.removeEventListener('wheel', onWheel)
      if (zoomFrame.current !== undefined) {
        cancelAnimationFrame(zoomFrame.current)
        zoomFrame.current = undefined
      }
      clearTimeout(zoomSettle.current)
    }
  }, [ref, model, x, y, zoom, onWheelScroll])

  useEffect(() => {
    if (panPointer === undefined) {
      return undefined
    }
    // a frame applies the distance from the last applied position to the
    // newest one, so a move landing while a frame is pending is not dropped
    function onMove(event: PointerEvent) {
      if (event.pointerId !== panPointer) {
        return
      }
      event.preventDefault()
      latest.current = { x: event.clientX, y: event.clientY }
      if (!panFrame.current) {
        panFrame.current = true
        requestAnimationFrame(() => {
          const to = latest.current
          model.doScrollX(x ? to.x - prev.current.x : 0)
          model.doScrollY(y ? to.y - prev.current.y : 0)
          prev.current = to
          panFrame.current = false
        })
      }
    }
    function onUp(event: PointerEvent) {
      if (event.pointerId === panPointer) {
        setPanPointer(undefined)
      }
    }
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onUp, true)
    return () => {
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
    }
  }, [panPointer, model, x, y])

  function onPointerDown(event: React.PointerEvent) {
    if (event.button === 0 && event.isPrimary && panPointer === undefined) {
      prev.current = { x: event.clientX, y: event.clientY }
      latest.current = prev.current
      setPanPointer(event.pointerId)
    }
  }

  return { onPointerDown, touchAction: panTouchAction(model, axes) }
}

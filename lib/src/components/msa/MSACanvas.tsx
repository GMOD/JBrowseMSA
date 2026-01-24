import React, { useEffect, useRef, useState } from 'react'

import { observer } from 'mobx-react'

import Loading from './Loading.tsx'
import MSACanvasBlock from './MSACanvasBlock.tsx'

import type { MsaViewModel } from '../../model.ts'

const MSACanvas = observer(function ({ model }: { model: MsaViewModel }) {
  const {
    MSA,
    verticalScrollbarWidth,
    msaFilehandle,
    height,
    msaAreaWidth,
    blocks2d,
  } = model
  const ref = useRef<HTMLDivElement>(null)
  // wheel
  const scheduled = useRef(false)
  const deltaX = useRef(0)
  const deltaY = useRef(0)
  // mouse click-and-drag scrolling
  const prevX = useRef<number>(0)
  const prevY = useRef<number>(0)
  const [mouseDragging, setMouseDragging] = useState(false)
  useEffect(() => {
    const curr = ref.current
    if (!curr) {
      return
    }
    function onWheel(event: WheelEvent) {
      deltaX.current += event.deltaX
      deltaY.current += event.deltaY

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
    curr.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      curr.removeEventListener('wheel', onWheel)
    }
  }, [model])

  useEffect(() => {
    let cleanup = () => {}

    function globalMouseMove(event: MouseEvent) {
      event.preventDefault()
      const currX = event.clientX
      const currY = event.clientY
      const distanceX = currX - prevX.current
      const distanceY = currY - prevY.current
      if (distanceX || distanceY) {
        // use rAF to make it so multiple event handlers aren't fired per-frame
        // see https://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
        if (!scheduled.current) {
          scheduled.current = true
          window.requestAnimationFrame(() => {
            model.doScrollX(distanceX)
            model.doScrollY(distanceY)
            scheduled.current = false
            prevX.current = event.clientX
            prevY.current = event.clientY
          })
        }
      }
    }

    function globalMouseUp() {
      prevX.current = 0
      if (mouseDragging) {
        setMouseDragging(false)
      }
    }

    if (mouseDragging) {
      window.addEventListener('mousemove', globalMouseMove, true)
      window.addEventListener('mouseup', globalMouseUp, true)
      cleanup = () => {
        window.removeEventListener('mousemove', globalMouseMove, true)
        window.removeEventListener('mouseup', globalMouseUp, true)
      }
    }
    return cleanup
  }, [model, mouseDragging])

  return (
    <div
      ref={ref}
      onMouseDown={event => {
        // check if clicking a draggable element or a resize handle
        const target = event.target as HTMLElement
        if (target.draggable || target.dataset.resizer) {
          return
        }

        // otherwise do click and drag scroll
        if (event.button === 0) {
          prevX.current = event.clientX
          prevY.current = event.clientY
          setMouseDragging(true)
        }
      }}
      onMouseUp={event => {
        event.preventDefault()
        setMouseDragging(false)
      }}
      onMouseLeave={event => {
        event.preventDefault()
      }}
      style={{
        position: 'relative',
        height,
        width: msaAreaWidth - verticalScrollbarWidth,
        overflow: 'hidden',
      }}
    >
      {!MSA && !msaFilehandle ? null : MSA ? (
        blocks2d.map(([bx, by]) => (
          <MSACanvasBlock
            key={`${bx}_${by}`}
            model={model}
            offsetX={bx}
            offsetY={by}
          />
        ))
      ) : (
        <Loading />
      )}
    </div>
  )
})

export default MSACanvas

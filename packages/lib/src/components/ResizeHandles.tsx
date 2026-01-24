import React, { useEffect, useRef, useState } from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../model.ts'

export const VerticalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { resizeHandleWidth } = model
  const [mouseDragging, setMouseDragging] = useState(false)
  const scheduled = useRef(false)
  const prevX = useRef(0)

  useEffect(() => {
    function globalMouseMove(event: MouseEvent) {
      event.preventDefault()
      const currX = event.clientX
      if (prevX.current === 0) {
        prevX.current = event.clientX
      } else {
        const distance = currX - prevX.current
        if (distance) {
          // use rAF to make it so multiple event handlers aren't fired per-frame
          // see https://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
          if (!scheduled.current) {
            scheduled.current = true
            window.requestAnimationFrame(() => {
              model.setTreeAreaWidth(model.treeAreaWidth + distance)
              scheduled.current = false
              prevX.current = event.clientX
            })
          }
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
      document.addEventListener('mousemove', globalMouseMove, true)
      document.addEventListener('mouseup', globalMouseUp, true)
      return () => {
        document.removeEventListener('mousemove', globalMouseMove, true)
        document.removeEventListener('mouseup', globalMouseUp, true)
      }
    }
    return () => {}
  }, [mouseDragging, model])

  return (
    <div>
      <div
        onMouseDown={() => {
          setMouseDragging(true)
        }}
        style={{
          cursor: 'ew-resize',
          height: '100%',
          width: resizeHandleWidth,
          background: 'rgba(200,200,200)',
          position: 'relative',
        }}
      />
    </div>
  )
})

export const HorizontalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { resizeHandleWidth } = model
  const [mouseDragging, setMouseDragging] = useState(false)
  const scheduled = useRef(false)
  const prevY = useRef(0)

  useEffect(() => {
    function globalMouseMove(event: MouseEvent) {
      event.preventDefault()
      const currY = event.clientY
      if (prevY.current === 0) {
        prevY.current = event.clientY
      } else {
        const distance = currY - prevY.current
        if (distance) {
          // use rAF to make it so multiple event handlers aren't fired per-frame
          // see https://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
          if (!scheduled.current) {
            scheduled.current = true
            window.requestAnimationFrame(() => {
              model.setHeight(model.height + distance)
              scheduled.current = false
              prevY.current = event.clientY
            })
          }
        }
      }
    }

    function globalMouseUp() {
      prevY.current = 0
      if (mouseDragging) {
        setMouseDragging(false)
      }
    }
    if (mouseDragging) {
      document.addEventListener('mousemove', globalMouseMove, true)
      document.addEventListener('mouseup', globalMouseUp, true)
      return () => {
        document.removeEventListener('mousemove', globalMouseMove, true)
        document.removeEventListener('mouseup', globalMouseUp, true)
      }
    }
    return () => {}
  }, [mouseDragging, model])

  return (
    <div>
      <div
        onMouseDown={() => {
          setMouseDragging(true)
        }}
        style={{
          cursor: 'ns-resize',
          width: '100%',
          height: resizeHandleWidth,
          background: 'rgba(200,200,200)',
          position: 'relative',
        }}
      />
    </div>
  )
})

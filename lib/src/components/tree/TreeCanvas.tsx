import React, { useEffect, useRef, useState } from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { observer } from 'mobx-react'

import TreeCanvasBlock from './TreeCanvasBlock'
import { padding } from './renderTreeCanvas'

import type { MsaViewModel } from '../../model'

const TreeCanvas = observer(function ({ model }: { model: MsaViewModel }) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseoverRef = useRef<HTMLCanvasElement>(null)
  const scheduled = useRef(false)
  const deltaY = useRef(0)
  const prevY = useRef<number>(0)
  const { treeWidth, height, blocksY, treeAreaWidth, scrollY } = model
  const [mouseDragging, setMouseDragging] = useState(false)

  useEffect(() => {
    const curr = ref.current
    if (!curr) {
      return
    }
    function onWheel(event: WheelEvent) {
      deltaY.current += event.deltaY

      if (!scheduled.current) {
        scheduled.current = true
        requestAnimationFrame(() => {
          model.doScrollY(-deltaY.current)
          deltaY.current = 0
          scheduled.current = false
        })
      }
      event.preventDefault()
      event.stopPropagation()
    }
    curr.addEventListener('wheel', onWheel)
    return () => {
      curr.removeEventListener('wheel', onWheel)
    }
  }, [model])

  useEffect(() => {
    let cleanup = () => {}

    function globalMouseMove(event: MouseEvent) {
      event.preventDefault()
      const currY = event.clientY
      const distanceY = currY - prevY.current
      if (distanceY) {
        // use rAF to make it so multiple event handlers aren't fired per-frame
        // see
        // https://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
        if (!scheduled.current) {
          scheduled.current = true
          window.requestAnimationFrame(() => {
            model.doScrollY(distanceY)
            scheduled.current = false
            prevY.current = event.clientY
          })
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
      window.addEventListener('mousemove', globalMouseMove, true)
      window.addEventListener('mouseup', globalMouseUp, true)
      cleanup = () => {
        window.removeEventListener('mousemove', globalMouseMove, true)
        window.removeEventListener('mouseup', globalMouseUp, true)
      }
    }
    return cleanup
  }, [model, mouseDragging])

  // Global tree mouseover effect
  useEffect(() => {
    const ctx = mouseoverRef.current?.getContext('2d')
    return ctx
      ? autorun(() => {
          if (isAlive(model)) {
            ctx.resetTransform()
            ctx.clearRect(0, 0, treeAreaWidth, height)

            // Highlight reference row (relativeTo) persistently
            const { relativeTo, leaves, rowHeight, hoveredTreeNode } = model
            if (relativeTo) {
              const referenceLeaf = leaves.find(
                leaf => leaf.data.name === relativeTo,
              )
              if (referenceLeaf) {
                const y = referenceLeaf.x! + scrollY
                ctx.fillStyle = 'rgba(0,128,255,0.3)' // Blue highlight for reference row
                ctx.fillRect(0, y - rowHeight / 2, treeAreaWidth, rowHeight)
              }
            }

            // Highlight multiple rows when hovering over tree nodes
            if (hoveredTreeNode) {
              ctx.fillStyle = 'rgba(255,165,0,0.2)' // Orange highlight for tree hover
              for (const descendantName of hoveredTreeNode.descendantNames) {
                const matchingLeaf = leaves.find(
                  leaf => leaf.data.name === descendantName,
                )
                if (matchingLeaf) {
                  const y = matchingLeaf.x! + scrollY
                  ctx.fillRect(0, y - rowHeight / 2, treeAreaWidth, rowHeight)
                }
              }
            }

            // Highlight single tree row corresponding to MSA mouseover (if not part of multi-row hover)
            const { mouseOverRowName } = model
            if (
              mouseOverRowName &&
              mouseOverRowName !== relativeTo &&
              !hoveredTreeNode?.descendantNames.includes(mouseOverRowName)
            ) {
              // Find the leaf node that matches the hovered row
              const matchingLeaf = leaves.find(
                leaf => leaf.data.name === mouseOverRowName,
              )
              if (matchingLeaf) {
                const y = matchingLeaf.x! + scrollY
                ctx.fillStyle = 'rgba(255,165,0,0.2)' // Orange highlight for MSA sync
                ctx.fillRect(0, y - rowHeight / 2, treeAreaWidth, rowHeight)
              }
            }
          }
        })
      : undefined
  }, [model, treeAreaWidth, height, scrollY])

  function mouseDown(event: React.MouseEvent) {
    // check if clicking a draggable element or a resize handle
    const target = event.target as HTMLElement
    if (target.draggable || target.dataset.resizer) {
      return
    }

    // otherwise do click and drag scroll
    if (event.button === 0) {
      prevY.current = event.clientY
      setMouseDragging(true)
    }
  }

  return (
    <div
      ref={ref}
      onMouseDown={mouseDown}
      onMouseUp={event => {
        // this local mouseup is used in addition to the global because
        // sometimes the global add/remove are not called in time, resulting in
        // issue #533
        event.preventDefault()
        setMouseDragging(false)
      }}
      onMouseLeave={event => {
        event.preventDefault()
      }}
      style={{
        height,
        position: 'relative',
        width: treeWidth + padding,
      }}
    >
      {blocksY.map(block => (
        <TreeCanvasBlock key={block} model={model} offsetY={block} />
      ))}
      <canvas
        ref={mouseoverRef}
        width={treeAreaWidth}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: treeAreaWidth,
          height,
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
})

export default TreeCanvas

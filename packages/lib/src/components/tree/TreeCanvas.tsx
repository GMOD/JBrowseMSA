import React, { useCallback, useEffect, useRef } from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { observer } from 'mobx-react'

import TreeCanvasBlock from './TreeCanvasBlock.tsx'
import { padding } from './renderTreeCanvas.ts'
import { useWheelScroll } from '../../useWheelScroll.ts'

import type { MsaViewModel } from '../../model.ts'

const referenceColor = 'rgba(0,128,255,0.3)'
const treeHoverColor = 'rgba(255,165,0,0.2)'

const TreeCanvas = observer(function ({ model }: { model: MsaViewModel }) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseoverRef = useRef<HTMLCanvasElement>(null)
  const { treeWidth, height, blocksY, treeAreaWidth } = model
  const onScrollY = useCallback(
    (d: number) => {
      model.doScrollY(d)
    },
    [model],
  )
  const { onMouseDown, onMouseUp } = useWheelScroll({ ref, onScrollY })

  useEffect(() => {
    const ctx = mouseoverRef.current?.getContext('2d')
    return ctx
      ? autorun(() => {
          if (isAlive(model)) {
            const {
              relativeTo,
              leaves,
              rowHeight,
              hoveredTreeNode,
              treeAreaWidth: w,
              height: h,
              scrollY: sy,
              mouseOverRowName,
            } = model
            ctx.resetTransform()
            ctx.clearRect(0, 0, w, h)

            if (relativeTo) {
              const referenceLeaf = leaves.find(
                leaf => leaf.data.name === relativeTo,
              )
              if (referenceLeaf) {
                ctx.fillStyle = referenceColor
                ctx.fillRect(
                  0,
                  referenceLeaf.x! + sy - rowHeight / 2,
                  w,
                  rowHeight,
                )
              }
            }

            if (hoveredTreeNode) {
              ctx.fillStyle = treeHoverColor
              for (const descendantName of hoveredTreeNode.descendantNames) {
                const matchingLeaf = leaves.find(
                  leaf => leaf.data.name === descendantName,
                )
                if (matchingLeaf) {
                  ctx.fillRect(
                    0,
                    matchingLeaf.x! + sy - rowHeight / 2,
                    w,
                    rowHeight,
                  )
                }
              }
            }

            if (
              mouseOverRowName &&
              mouseOverRowName !== relativeTo &&
              !hoveredTreeNode?.descendantNames.includes(mouseOverRowName)
            ) {
              const matchingLeaf = leaves.find(
                leaf => leaf.data.name === mouseOverRowName,
              )
              if (matchingLeaf) {
                ctx.fillStyle = treeHoverColor
                ctx.fillRect(
                  0,
                  matchingLeaf.x! + sy - rowHeight / 2,
                  w,
                  rowHeight,
                )
              }
            }
          }
        })
      : undefined
  }, [model])

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
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

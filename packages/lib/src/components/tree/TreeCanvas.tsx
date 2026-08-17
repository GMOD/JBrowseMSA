import React, { useCallback, useRef } from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { useWheelScroll } from '../../useWheelScroll.ts'
import { referenceColor, treeHoverColor } from '../overlayColors.ts'
import TreeCanvasBlock from './TreeCanvasBlock.tsx'
import { padding } from './renderTreeCanvas.ts'

import type { MsaViewModel } from '../../model.ts'

const TreeCanvas = observer(function ({ model }: { model: MsaViewModel }) {
  const ref = useRef<HTMLDivElement>(null)
  const { treeWidth, height, blocksY, treeAreaWidth } = model
  const onScrollY = useCallback(
    (d: number) => {
      model.doScrollY(d)
    },
    [model],
  )
  const { onMouseDown, onMouseUp } = useWheelScroll({ ref, onScrollY })

  const mouseoverRef = useCanvasAutorun({
    draw: ctx => {
      if (isAlive(model)) {
        const {
          rowHeight,
          treeAreaWidth: w,
          height: h,
          scrollY: sy,
          mouseRow,
          referenceRowIndex,
          hoveredRowIndices,
        } = model
        ctx.resetTransform()
        ctx.clearRect(0, 0, w, h)

        // rows are laid out at a fixed pitch, so a row index is all that is
        // needed to place its band (leaf.x is rowHeight*(index+0.5))
        const fillRow = (index: number) => {
          ctx.fillRect(0, index * rowHeight + sy, w, rowHeight)
        }

        if (referenceRowIndex !== undefined) {
          ctx.fillStyle = referenceColor
          fillRow(referenceRowIndex)
        }

        ctx.fillStyle = treeHoverColor
        for (const index of hoveredRowIndices) {
          fillRow(index)
        }
        if (
          mouseRow !== undefined &&
          mouseRow !== referenceRowIndex &&
          !hoveredRowIndices.includes(mouseRow)
        ) {
          fillRow(mouseRow)
        }
      }
    },
    width: treeAreaWidth,
    height,
    deps: [model],
  })

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

import React, { useCallback, useRef } from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { useWheelScroll } from '../../useWheelScroll.ts'
import CladeLabels from './CladeLabels.tsx'
import TreeCanvasBlock from './TreeCanvasBlock.tsx'
import { renderTreeMouseover } from './renderTreeMouseover.ts'

import type { MsaViewModel } from '../../model.ts'

const TreeCanvas = observer(function ({ model }: { model: MsaViewModel }) {
  const ref = useRef<HTMLDivElement>(null)
  const { height, blocksY, treeAreaWidth, scrollY, highResScaleFactor } = model
  const onScrollY = useCallback(
    (d: number) => {
      model.doScrollY(d)
    },
    [model],
  )
  const { onMouseDown, onMouseUp } = useWheelScroll({ ref, onScrollY })

  const canvasWidth = treeAreaWidth * highResScaleFactor
  const canvasHeight = height * highResScaleFactor
  const mouseoverRef = useCanvasAutorun({
    draw: ctx => {
      if (isAlive(model)) {
        renderTreeMouseover({ ctx, model })
      }
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model],
  })

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        height,
        position: 'relative',
        width: treeAreaWidth,
      }}
    >
      {/* one transform for the whole block set, matching MSACanvas: the tree
      scrolls in lockstep with the alignment and on the same compositor move */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translateY(${scrollY}px)`,
          willChange: 'transform',
        }}
      >
        {blocksY.map(block => (
          <TreeCanvasBlock key={block} model={model} offsetY={block} />
        ))}
        <CladeLabels model={model} />
      </div>
      <canvas
        ref={mouseoverRef}
        width={canvasWidth}
        height={canvasHeight}
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

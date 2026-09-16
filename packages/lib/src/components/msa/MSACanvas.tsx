import React, { useCallback, useRef } from 'react'

import { observer } from 'mobx-react'

import { useWheelScroll } from '../../useWheelScroll.ts'
import Loading from './Loading.tsx'
import MSACanvasBlock from './MSACanvasBlock.tsx'

import type { MsaViewModel } from '../../model.ts'

const MSACanvas = observer(function ({ model }: { model: MsaViewModel }) {
  const {
    MSA,
    msaFilehandle,
    height,
    msaCanvasWidth,
    blocks2d,
    scrollZoom,
    scrollX,
    scrollY,
  } = model
  const ref = useRef<HTMLDivElement>(null)
  const onScrollX = useCallback(
    (d: number) => {
      model.doScrollX(d)
    },
    [model],
  )
  const onScrollY = useCallback(
    (d: number) => {
      model.doScrollY(d)
    },
    [model],
  )
  const onZoom = useCallback(
    (scaleFactor: number, offsetX: number, offsetY: number) => {
      model.zoomToPos(scaleFactor, offsetX, offsetY, model.wheelZoomAxis)
    },
    [model],
  )
  const { onMouseDown, onMouseUp } = useWheelScroll({
    ref,
    onScrollX,
    onScrollY,
    onZoom,
    scrollZoom,
  })

  return (
    <div
      ref={ref}
      // screenshot callouts anchor to columns from this rect's origin:
      // col*colWidth + scrollX, row*rowHeight + scrollY
      data-testid="msa_canvas"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        position: 'relative',
        height,
        width: msaCanvasWidth,
        overflow: 'hidden',
      }}
    >
      {!MSA && !msaFilehandle ? null : MSA ? (
        // one transform for the whole block set, so a scroll frame is a
        // compositor move rather than a style write per block
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${scrollX}px, ${scrollY}px)`,
            willChange: 'transform',
          }}
        >
          {blocks2d.map(([bx, by]) => (
            <MSACanvasBlock
              key={`${bx}_${by}`}
              model={model}
              offsetX={bx}
              offsetY={by}
            />
          ))}
        </div>
      ) : (
        <Loading />
      )}
    </div>
  )
})

export default MSACanvas

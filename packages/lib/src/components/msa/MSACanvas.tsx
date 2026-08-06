import React, { useCallback, useRef } from 'react'

import { observer } from 'mobx-react'

import { useWheelScroll } from '../../useWheelScroll.ts'
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
    scrollZoom,
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
      model.zoomToPos(scaleFactor, offsetX, offsetY)
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
      // the MSA viewport: its rect is the origin every column/row offset is
      // measured from (col*colWidth + scrollX, row*rowHeight + scrollY), which
      // is what lets a screenshot callout anchor to an alignment column instead
      // of a hand-measured pixel
      data-testid="msa_canvas"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
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

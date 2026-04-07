import React, { useCallback, useRef } from 'react'

import { observer } from 'mobx-react'

import Loading from './Loading.tsx'
import MSACanvasBlock from './MSACanvasBlock.tsx'
import { useWheelScroll } from '../../useWheelScroll.ts'

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
  const { onMouseDown, onMouseUp } = useWheelScroll({
    ref,
    onScrollX,
    onScrollY,
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

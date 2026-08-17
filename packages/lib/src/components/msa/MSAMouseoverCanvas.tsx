import React from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { renderMouseover } from './renderMSAMouseover.ts'

import type { MsaViewModel } from '../../model.ts'

const MSAMouseoverCanvas = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { height, msaAreaWidth, verticalScrollbarWidth, highResScaleFactor } =
    model
  const width = msaAreaWidth - verticalScrollbarWidth
  const canvasWidth = width * highResScaleFactor
  const canvasHeight = height * highResScaleFactor
  const ref = useCanvasAutorun({
    draw: ctx => {
      if (isAlive(model)) {
        renderMouseover({ ctx, model })
      }
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model],
  })

  return (
    <canvas
      ref={ref}
      id="mouseover"
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    />
  )
})

export default MSAMouseoverCanvas

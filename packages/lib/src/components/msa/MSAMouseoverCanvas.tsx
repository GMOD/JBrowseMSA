import React from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { observer } from 'mobx-react'

import { msaOverlayZIndex } from '../../constants.ts'
import { useCanvasTheme } from '../../darkReader.ts'
import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { renderMouseover } from './renderMSAMouseover.ts'

import type { MsaViewModel } from '../../model.ts'

const MSAMouseoverCanvas = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const {
    msaAreaHeight: height,
    msaCanvasWidth: width,
    highResScaleFactor,
  } = model
  const theme = useCanvasTheme()
  const canvasWidth = width * highResScaleFactor
  const canvasHeight = height * highResScaleFactor
  const ref = useCanvasAutorun({
    draw: ctx => {
      if (isAlive(model)) {
        renderMouseover({ ctx, model, theme })
      }
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, theme],
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
        zIndex: msaOverlayZIndex,
        pointerEvents: 'none',
      }}
    />
  )
})

export default MSAMouseoverCanvas

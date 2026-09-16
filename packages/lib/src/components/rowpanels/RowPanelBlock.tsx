import React, { useState } from 'react'

import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import PortalTooltip from '../PortalTooltip.tsx'
import { renderStrip } from './renderStrip.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedRowPanel } from '../../types.ts'

interface CellHover {
  name: string
  value?: string
  clientX: number
  clientY: number
}

const RowPanelBlock = observer(function ({
  model,
  panel,
  offsetY,
}: {
  model: MsaViewModel
  panel: ResolvedRowPanel
  offsetY: number
}) {
  const [hovered, setHovered] = useState<CellHover>()
  const { blockSize, highResScaleFactor, rowHeight } = model
  const width = panel.width
  const height = blockSize
  const canvasWidth = width * highResScaleFactor
  const canvasHeight = height * highResScaleFactor

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      renderStrip({ ctx, model, panel, x: 0, offsetY })
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, panel, offsetY],
  })

  return (
    <>
      <canvas
        ref={ref}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: offsetY, left: 0, width, height }}
        onMouseMove={event => {
          const row = Math.floor(
            (event.nativeEvent.offsetY + offsetY) / rowHeight,
          )
          const name = model.leaves[row]?.data.name
          setHovered(
            name === undefined
              ? undefined
              : {
                  name,
                  value: model.rowDataOf(name)?.[panel.field],
                  clientX: event.clientX,
                  clientY: event.clientY,
                },
          )
          model.setMousePos(undefined, name === undefined ? undefined : row)
        }}
        onMouseLeave={() => {
          setHovered(undefined)
          model.setMousePos(undefined, undefined)
        }}
      />
      {hovered ? (
        <PortalTooltip clientX={hovered.clientX} clientY={hovered.clientY}>
          <div>{hovered.name}</div>
          <div>
            {panel.header}: {hovered.value ?? '(none)'}
          </div>
        </PortalTooltip>
      ) : null}
    </>
  )
})

export default RowPanelBlock

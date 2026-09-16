import React, { useState } from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { featureField, featureName } from '../../featureFields.ts'
import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import PortalTooltip from '../PortalTooltip.tsx'
import { renderRowPanel } from './renderRowPanel.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedRowPanel } from '../../types.ts'

interface Hover {
  name: string
  lines: string[]
  clientX: number
  clientY: number
}

// what the cell or span under the pointer reads, which is the field a strip
// colors by, and a span's name, its coordinates and its encoded field
function hoverLines({
  model,
  panel,
  name,
  x,
}: {
  model: MsaViewModel
  panel: ResolvedRowPanel
  name: string
  x: number
}) {
  if (panel.kind === 'strip') {
    return [
      `${panel.header}: ${model.rowDataOf(name)?.[panel.field] ?? '(none)'}`,
    ]
  }
  const span = panel.spans
    .get(name)
    ?.findLast(s => x >= s.xStart && x <= s.xEnd)
  if (!span) {
    return []
  }
  const { annotation } = span
  const strand =
    annotation.strand === undefined
      ? ''
      : annotation.strand < 0
        ? ' (-)'
        : ' (+)'
  const value = panel.field ? featureField(annotation, panel.field) : undefined
  return [
    featureName(annotation) ?? annotation.accession,
    `${annotation.start}-${annotation.end}${strand}`,
    ...(value === undefined ? [] : [`${panel.field}: ${value}`]),
  ]
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
  const [hovered, setHovered] = useState<Hover>()
  const theme = useTheme()
  const { blockSize, highResScaleFactor, rowHeight } = model
  const width = panel.width
  const height = blockSize
  const canvasWidth = width * highResScaleFactor
  const canvasHeight = height * highResScaleFactor

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      renderRowPanel({ ctx, model, theme, panel, x: 0, offsetY })
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, theme, panel, offsetY],
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
          const lines =
            name === undefined
              ? []
              : hoverLines({
                  model,
                  panel,
                  name,
                  x: event.nativeEvent.offsetX,
                })
          setHovered(
            name === undefined || lines.length === 0
              ? undefined
              : {
                  name,
                  lines,
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
          {hovered.lines.map(line => (
            <div key={line}>{line}</div>
          ))}
        </PortalTooltip>
      ) : null}
    </>
  )
})

export default RowPanelBlock

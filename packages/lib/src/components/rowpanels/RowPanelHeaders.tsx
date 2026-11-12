import React from 'react'

import { observer } from 'mobx-react'

import { useCanvasTheme } from '../../darkReader.ts'
import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import {
  drawHeaderAxis,
  headerAxisHeight,
  headerRunsAcross,
} from './headerLayout.ts'

import type { MsaViewModel } from '../../model.ts'
import type { PanelAxis } from '../../types.ts'

const AxisCanvas = observer(function ({
  model,
  axis,
  width,
}: {
  model: MsaViewModel
  axis: PanelAxis
  width: number
}) {
  const theme = useCanvasTheme()
  const { highResScaleFactor: k } = model
  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, width * k, headerAxisHeight * k)
      ctx.scale(k, k)
      drawHeaderAxis(ctx, axis, theme.palette.text.primary)
    },
    width: width * k,
    height: headerAxisHeight * k,
    deps: [axis, theme, k],
  })
  return (
    <canvas
      ref={ref}
      width={width * k}
      height={headerAxisHeight * k}
      style={{ display: 'block', width, height: headerAxisHeight }}
    />
  )
})

/**
 * The row panel headers, at the foot of the band above the panels beside the
 * tree ruler and the minimap, where the export draws them. A narrow strip's
 * name is DOM text turned on its side, since the canvas layer has no rotation,
 * and the SVG export draws it with a `rotate(-90)`. A panel wider than the
 * band is tall writes its name across. A panel with a value scale draws its
 * axis at the foot of the band and its header above it, as the axis title.
 */
const RowPanelHeaders = observer(function ({ model }: { model: MsaViewModel }) {
  const { resolvedRowPanels, rowPanelsHeaderHeight, fontSize } = model
  return resolvedRowPanels.length > 0 ? (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        height: rowPanelsHeaderHeight,
        alignItems: 'flex-end',
        alignSelf: 'flex-end',
      }}
    >
      {resolvedRowPanels.map(panel => {
        const across = !!panel.axis || headerRunsAcross(panel.width)
        const title = (
          <div
            title={panel.header}
            style={{
              width: panel.width,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...(across
                ? { fontSize, textAlign: 'center' }
                : {
                    height: rowPanelsHeaderHeight,
                    fontSize: Math.min(fontSize, panel.width),
                    // vertical-rl reads top to bottom, and the half turn makes
                    // it read upwards from the strip, as rotate(-90) exports
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }),
            }}
          >
            {panel.header}
          </div>
        )
        return panel.axis ? (
          <div key={panel.id} style={{ width: panel.width }}>
            {title}
            <AxisCanvas model={model} axis={panel.axis} width={panel.width} />
          </div>
        ) : (
          <React.Fragment key={panel.id}>{title}</React.Fragment>
        )
      })}
    </div>
  ) : null
})

export default RowPanelHeaders

import React from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const MinimapSVG = observer(({ model }: { model: MsaViewModel }) => {
  const {
    scrollX,
    msaAreaWidth: W,
    minimapHeight: H,
    colWidth,
    numColumns,
  } = model

  const BAR_HEIGHT = 12
  const H2 = H - BAR_HEIGHT

  const unit = W / numColumns / colWidth
  const left = -scrollX
  const right = left + W
  const s = left * unit
  const e = right * unit
  const w = Math.max(e - s, 20)
  const fillColor = 'rgb(66, 119, 127)'
  const fillOpacity = 0.3

  return (
    <>
      <rect
        x={0}
        y={0}
        width={W}
        height={BAR_HEIGHT}
        stroke="#555"
        fill="none"
      />
      <rect
        x={Math.max(0, s)}
        y={0}
        width={w}
        height={BAR_HEIGHT}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke="#555"
      />
      <g transform={`translate(0 ${BAR_HEIGHT})`}>
        <polygon
          fill={fillColor}
          fillOpacity={fillOpacity}
          points={`${s + w},0 ${s},0 0,${H2} ${W},${H2}`}
        />
      </g>
    </>
  )
})

export default MinimapSVG

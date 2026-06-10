import React from 'react'

import { observer } from 'mobx-react'

import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

import type { MsaViewModel } from '../../model.ts'

const MinimapSVG = observer(({ model }: { model: MsaViewModel }) => {
  const { msaAreaWidth } = model
  const { s, w, polygonPoints } = getMinimapLayout(model)
  const fillColor = 'rgb(66, 119, 127)'
  const fillOpacity = 0.3

  return (
    <>
      <rect
        x={0}
        y={0}
        width={msaAreaWidth}
        height={MINIMAP_BAR_HEIGHT}
        stroke="#555"
        fill="none"
      />
      <rect
        x={Math.max(0, s)}
        y={0}
        width={w}
        height={MINIMAP_BAR_HEIGHT}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke="#555"
      />
      <g transform={`translate(0 ${MINIMAP_BAR_HEIGHT})`}>
        <polygon
          fill={fillColor}
          fillOpacity={fillOpacity}
          points={polygonPoints}
        />
      </g>
    </>
  )
})

export default MinimapSVG

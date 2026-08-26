import React from 'react'

import { scrollbarThumbFill } from '../DragHandle.tsx'
import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

import type { MsaViewModel } from '../../model.ts'

// The static counterpart to Minimap, for the SVG export. renderToSvg drives it
// through renderToStaticMarkup, so it reads the model once and never re-renders
// -- no observer wrapper.
export default function MinimapSVG({ model }: { model: MsaViewModel }) {
  const { msaCanvasWidth } = model
  const { s, w, polygonPoints } = getMinimapLayout(model)

  return (
    <>
      <rect
        x={0}
        y={0}
        width={msaCanvasWidth}
        height={MINIMAP_BAR_HEIGHT}
        stroke="#555"
        fill="none"
      />
      <rect
        x={Math.max(0, s)}
        y={0}
        width={w}
        height={MINIMAP_BAR_HEIGHT}
        fill={scrollbarThumbFill}
        stroke="#555"
      />
      <g transform={`translate(0 ${MINIMAP_BAR_HEIGHT})`}>
        <polygon fill={scrollbarThumbFill} points={polygonPoints} />
      </g>
    </>
  )
}

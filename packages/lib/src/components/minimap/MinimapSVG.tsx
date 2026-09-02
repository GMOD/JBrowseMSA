import React from 'react'

import { scrollbarThumbFill } from '../DragHandle.tsx'
import { canvasHref, msaThumbnail } from '../msa/msaRaster.ts'
import { MINIMAP_BAR_HEIGHT, getMinimapLayout } from './minimapLayout.ts'

import type { MsaViewModel } from '../../model.ts'
import type { Theme } from '@mui/material'

// The static counterpart to Minimap, for the SVG export. renderToSvg drives it
// through renderToStaticMarkup, so it reads the model once and never re-renders
// -- no observer wrapper.
export default function MinimapSVG({
  model,
  theme,
}: {
  model: MsaViewModel
  theme: Theme
}) {
  const { msaCanvasWidth } = model
  const { s, w, polygonPoints } = getMinimapLayout(model)
  // the same downsampled alignment the live minimap draws behind its thumb;
  // undefined wherever a canvas cannot be read back, leaving a bare outline
  const href = canvasHref(
    msaThumbnail({ model, theme, height: MINIMAP_BAR_HEIGHT }),
  )

  return (
    <>
      {href ? (
        <image
          href={href}
          x={0}
          y={0}
          width={msaCanvasWidth}
          height={MINIMAP_BAR_HEIGHT}
          preserveAspectRatio="none"
        />
      ) : null}
      <rect
        x={0}
        y={0}
        width={msaCanvasWidth}
        height={MINIMAP_BAR_HEIGHT}
        stroke={theme.palette.text.secondary}
        fill="none"
      />
      <rect
        x={Math.max(0, s)}
        y={0}
        width={w}
        height={MINIMAP_BAR_HEIGHT}
        fill={scrollbarThumbFill}
        stroke={theme.palette.text.secondary}
      />
      <g transform={`translate(0 ${MINIMAP_BAR_HEIGHT})`}>
        <polygon fill={scrollbarThumbFill} points={polygonPoints} />
      </g>
    </>
  )
}

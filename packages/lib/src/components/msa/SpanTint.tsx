import React from 'react'

import { hoverColor } from '../overlayColors.ts'
import { featureSpanMarks } from './drawFeatureSpans.ts'

import type { Annotation } from '../../types.ts'
import type { SpanBand, SpanSource } from './drawFeatureSpans.ts'

/**
 * The spans of `annotations` in `source`, filled with the hover color in an SVG
 * over the canvas that drew them.
 */
export default function SpanTint<T extends SpanBand>({
  source,
  annotations,
  width,
  height,
  top = 0,
  transform,
  zIndex,
}: {
  source: SpanSource<T>
  annotations: Annotation[]
  width: number
  height: number
  top?: number
  transform: string
  zIndex?: number
}) {
  const hovered = new Set(annotations)
  const rows = source.rows
    .map(row => ({
      ...row,
      bands: row.bands.filter(band => hovered.has(band.annotation)),
    }))
    .filter(row => row.bands.length > 0)
  const shapes = featureSpanMarks({
    ...source,
    rows,
    labelOf: undefined,
    labelDrawn: undefined,
    measureText: () => 0,
    xMin: -Infinity,
    xMax: Infinity,
  }).flatMap(row => row.shapes)
  return shapes.length > 0 ? (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top,
        left: 0,
        pointerEvents: 'none',
        zIndex,
      }}
    >
      <g transform={transform} fill={hoverColor}>
        {shapes.map(({ band, box, outline }) => {
          const key = `${band.lane}-${band.annotation.start}-${band.annotation.end}`
          return box ? (
            <rect key={key} x={box.x} y={box.y} width={box.w} height={box.h} />
          ) : outline ? (
            <polygon key={key} points={outline.join(' ')} />
          ) : null
        })}
      </g>
    </svg>
  ) : null
}

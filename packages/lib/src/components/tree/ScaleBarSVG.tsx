import React from 'react'

/**
 * The branch-length scale bar: its label over a bracket `bar.px` wide, both
 * resting on `y`.
 */
export default function ScaleBarSVG({
  bar,
  marginLeft,
  y,
  color,
}: {
  bar: { label: string; px: number }
  marginLeft: number
  y: number
  color: string
}) {
  return (
    <>
      <text x={marginLeft} y={y - 9} fontSize={10} fill={color}>
        {bar.label}
      </text>
      <path
        d={`M${marginLeft} ${y - 7} v6 h${bar.px} v-6`}
        fill="none"
        stroke={color}
      />
    </>
  )
}

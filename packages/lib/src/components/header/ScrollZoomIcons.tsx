import React from 'react'

import SvgIcon from '@mui/material/SvgIcon'

import type { SvgIconProps } from '@mui/material/SvgIcon'

// Mouse glyphs with outward arrows on the axes a wheel zoom scales.
// @mui/icons-material ships only the plain `Mouse`, and three variants that
// differ only in their arrows have to share one body to stay apart at 24px.
// The body's inner subpath runs the opposite sweep, which punches the hole the
// wheel bar sits in.
const BODY =
  'M12 5a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V9a4 4 0 0 0-4-4zm0 2a2 2 0 0 1 2 2v6a2 2 0 0 1-4 0V9a2 2 0 0 1 2-2z'
const WHEEL = 'M11.2 8.6h1.6v3.2h-1.6z'
const LEFT = 'M.4 12 5 15V9z'
const RIGHT = 'M23.6 12 19 9v6z'
const UP = 'M12 .4 15 4H9z'
const DOWN = 'M12 23.6 9 20h6z'

function MouseZoom({
  arrows,
  ...rest
}: SvgIconProps & { arrows: readonly string[] }) {
  return (
    <SvgIcon {...rest}>
      <path d={BODY} />
      <path d={WHEEL} />
      {arrows.map(d => (
        <path key={d} d={d} />
      ))}
    </SvgIcon>
  )
}

// the bare body, for a wheel that scrolls. @mui/icons-material's own `Mouse` is
// a solid silhouette, which would jump to a different drawing when the menu
// changes the mode.
export function MouseScroll(props: SvgIconProps) {
  return <MouseZoom {...props} arrows={[]} />
}

export function MouseZoomBoth(props: SvgIconProps) {
  return <MouseZoom {...props} arrows={[LEFT, RIGHT, UP, DOWN]} />
}

export function MouseZoomHorizontal(props: SvgIconProps) {
  return <MouseZoom {...props} arrows={[LEFT, RIGHT]} />
}

export function MouseZoomVertical(props: SvgIconProps) {
  return <MouseZoom {...props} arrows={[UP, DOWN]} />
}

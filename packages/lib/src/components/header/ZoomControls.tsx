import React from 'react'

import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import {
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material'
import { observer } from 'mobx-react'

import {
  MouseZoomBoth,
  MouseZoomHorizontal,
  MouseZoomVertical,
} from './ScrollZoomIcons.tsx'

import type { ScrollZoomAxis } from '../../constants.ts'
import type { MsaViewModel } from '../../model.ts'

const axisButtons = [
  {
    axis: 'both' as const,
    Icon: MouseZoomBoth,
    label: 'Wheel zooms both axes',
  },
  {
    axis: 'horizontal' as const,
    Icon: MouseZoomHorizontal,
    label: 'Wheel zooms columns only, holding the row height',
  },
  {
    axis: 'vertical' as const,
    Icon: MouseZoomVertical,
    label: 'Wheel zooms rows only, holding the column width',
  },
]

const ZoomControls = observer(function ZoomControls({
  model,
}: {
  model: MsaViewModel
}) {
  const { scrollZoom, scrollZoomAxis } = model
  return (
    <>
      <Tooltip title="Zoom in">
        <IconButton
          aria-label="Zoom in"
          onClick={() => {
            model.zoomIn()
          }}
        >
          <ZoomIn />
        </IconButton>
      </Tooltip>
      <Tooltip title="Zoom out">
        <IconButton
          aria-label="Zoom out"
          onClick={() => {
            model.zoomOut()
          }}
        >
          <ZoomOut />
        </IconButton>
      </Tooltip>
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label="Mouse wheel zoom"
        // null is the default state: no axis picked, so the wheel scrolls the
        // alignment
        value={scrollZoom ? scrollZoomAxis : null}
        onChange={(_event, value: ScrollZoomAxis | null) => {
          model.setScrollZoom(value !== null)
          if (value !== null) {
            model.setScrollZoomAxis(value)
          }
        }}
      >
        {axisButtons.map(({ axis, Icon, label }) => (
          <ToggleButton
            key={axis}
            value={axis}
            aria-label={label}
            title={`${label} (click again and the wheel scrolls instead; ctrl+wheel always zooms)`}
            sx={{ border: 'none' }}
          >
            <Icon />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </>
  )
})
export default ZoomControls

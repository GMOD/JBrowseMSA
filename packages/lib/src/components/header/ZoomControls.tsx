import React from 'react'

import Mouse from '@mui/icons-material/Mouse'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import { IconButton, ToggleButton, Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const ZoomControls = observer(function ZoomControls({
  model,
}: {
  model: MsaViewModel
}) {
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
      <ToggleButton
        value="scrollZoom"
        selected={model.scrollZoom}
        aria-label="Toggle scroll-to-zoom"
        title="Toggle scroll-to-zoom (zoom on plain mouse wheel; ctrl+wheel always zooms)"
        size="small"
        sx={{ border: 'none' }}
        onChange={() => {
          model.setScrollZoom(!model.scrollZoom)
        }}
      >
        <Mouse />
      </ToggleButton>
    </>
  )
})
export default ZoomControls

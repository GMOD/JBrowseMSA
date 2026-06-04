import React from 'react'

import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomInMap from '@mui/icons-material/ZoomInMap'
import ZoomOut from '@mui/icons-material/ZoomOut'
import { IconButton, ToggleButton } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const ZoomControls = observer(function ZoomControls({
  model,
}: {
  model: MsaViewModel
}) {
  return (
    <>
      <IconButton
        onClick={() => {
          model.zoomIn()
        }}
      >
        <ZoomIn />
      </IconButton>
      <IconButton
        onClick={() => {
          model.zoomOut()
        }}
      >
        <ZoomOut />
      </IconButton>
      <ToggleButton
        value="scrollZoom"
        selected={model.scrollZoom}
        title="Toggle scroll-to-zoom (zoom on plain mouse wheel; ctrl+wheel always zooms)"
        size="small"
        sx={{ border: 'none' }}
        onChange={() => {
          model.setScrollZoom(!model.scrollZoom)
        }}
      >
        <ZoomInMap />
      </ToggleButton>
    </>
  )
})
export default ZoomControls

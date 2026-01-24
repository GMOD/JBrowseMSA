import React from 'react'

import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import { IconButton } from '@mui/material'
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
    </>
  )
})
export default ZoomControls

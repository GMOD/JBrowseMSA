import React from 'react'

import { Slider, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model'

const GappynessSlider = observer(function GappynessSlider({
  model,
}: {
  model: MsaViewModel
}) {
  const { hideGaps, allowedGappyness } = model
  if (!hideGaps) {
    return null
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Typography style={{ whiteSpace: 'nowrap' }}>
        Hide columns w/ &gt;{allowedGappyness}% gaps
      </Typography>
      <Slider
        style={{ width: 100 }}
        min={1}
        max={100}
        value={allowedGappyness}
        onChange={(_, val) => {
          model.setAllowedGappyness(val)
        }}
      />
    </div>
  )
})

export default GappynessSlider

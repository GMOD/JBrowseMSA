import React from 'react'

import { Slider, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

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
      {/* the threshold is inclusive: blanks are columns whose gap count is at
          least ceil(allowedGappyness% of the rows), so at 100 it hides the
          columns that are entirely gaps rather than nothing */}
      <Typography style={{ whiteSpace: 'nowrap' }}>
        Hide columns w/ &ge;{allowedGappyness}% gaps
      </Typography>
      <Slider
        // In JBrowse other MUI Sliders share the page, so `.MuiSlider-thumb`
        // can match the wrong one. Tests and screenshot specs target
        // `[data-testid="gappyness_slider"] input`, the hidden range input that
        // takes focus and arrow/PageUp/PageDown.
        //
        // Not `slotProps={{ input: ... }}`: that widens `onChange`'s `val` to
        // `number | number[]`, which setAllowedGappyness rejects.
        data-testid="gappyness_slider"
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

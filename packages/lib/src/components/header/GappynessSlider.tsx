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
        // Named, because the class alone is not enough to find it from outside.
        // An MSA is normally embedded beside other MUI Sliders (in JBrowse, the
        // linear view's own zoom control), so a `.MuiSlider-thumb` selector in a
        // test or a screenshot spec picks whichever comes first in the document
        // and drives that instead — which reads as this slider ignoring its
        // keyboard. Target `[data-testid="gappyness_slider"] input` to reach the
        // hidden range input MUI renders in the thumb, which is the node that
        // takes focus and receives arrow/PageUp/PageDown.
        //
        // Deliberately NOT `slotProps={{ input: ... }}`: passing slotProps here
        // widens the Slider's generic so `onChange`'s `val` infers as
        // `number | number[]` and no longer assigns to setAllowedGappyness.
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

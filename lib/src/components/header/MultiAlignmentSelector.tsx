import React from 'react'

import { MenuItem, TextField } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const MultiAlignmentSelector = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { currentAlignment, alignmentNames } = model
  return alignmentNames.length > 0 ? (
    <TextField
      select
      variant="outlined"
      value={currentAlignment}
      size="small"
      onChange={event => {
        model.setCurrentAlignment(+event.target.value)
        model.setScrollX(0)
        model.setScrollY(0)
      }}
    >
      {alignmentNames.map((option, index) => (
        <MenuItem key={`${option}-${index}`} value={index}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  ) : null
})
export default MultiAlignmentSelector

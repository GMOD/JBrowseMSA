import React from 'react'

import { Checkbox, FormControlLabel } from '@mui/material'

export default function Checkbox2({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean
  label: string
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <div>
      <FormControlLabel
        control={
          <Checkbox disabled={disabled} checked={checked} onChange={onChange} />
        }
        label={label}
      />
    </div>
  )
}

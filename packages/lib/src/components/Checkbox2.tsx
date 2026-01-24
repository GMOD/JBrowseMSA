import React from 'react'

import {
  Checkbox,
  FormControlLabel,
  type FormControlLabelProps,
} from '@mui/material'

function FormControlLabel2(rest: FormControlLabelProps) {
  return (
    <div>
      <FormControlLabel {...rest} />
    </div>
  )
}
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
    <FormControlLabel2
      control={
        <Checkbox disabled={disabled} checked={checked} onChange={onChange} />
      }
      label={label}
    />
  )
}

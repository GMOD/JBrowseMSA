import React, { useState } from 'react'

import { Autocomplete, TextField } from '@mui/material'
import { observer } from 'mobx-react'

import { findableRowNames, goTo, rowNameSuggestions } from './goTo.ts'

import type { MsaViewModel } from '../../model.ts'

const label = 'Go to row or column'

const GoToBox = observer(function ({ model }: { model: MsaViewModel }) {
  const [missed, setMissed] = useState(false)
  const names = findableRowNames(model)
  return names.length > 1 || model.numColumns > 0 ? (
    <Autocomplete
      freeSolo
      size="small"
      options={names}
      filterOptions={(options, { inputValue }) =>
        rowNameSuggestions(options, inputValue)
      }
      value={null}
      blurOnSelect
      onInputChange={() => {
        setMissed(false)
      }}
      onChange={(_, text) => {
        if (text) {
          setMissed(!goTo(model, text))
        }
      }}
      style={{ width: 180, margin: 'auto 8px' }}
      renderInput={params => (
        <TextField
          {...params}
          error={missed}
          placeholder={label}
          title="A row name, a column number, or name:residue"
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, 'aria-label': label },
          }}
        />
      )}
    />
  ) : null
})

export default GoToBox

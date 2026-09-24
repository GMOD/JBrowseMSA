import React from 'react'

import { Autocomplete, TextField, createFilterOptions } from '@mui/material'
import { observer } from 'mobx-react'

import { findableRowNames, revealRow } from './revealRow.ts'

import type { MsaViewModel } from '../../model.ts'

const filterOptions = createFilterOptions<string>({ limit: 50 })

const RowSearch = observer(function ({ model }: { model: MsaViewModel }) {
  const names = findableRowNames(model)
  return names.length > 1 ? (
    <Autocomplete
      size="small"
      options={names}
      filterOptions={filterOptions}
      value={null}
      blurOnSelect
      onChange={(_, name) => {
        if (name) {
          revealRow(model, name)
        }
      }}
      style={{ width: 180, margin: 'auto 8px' }}
      renderInput={params => (
        <TextField {...params} placeholder="Find row" aria-label="Find row" />
      )}
    />
  ) : null
})

export default RowSearch

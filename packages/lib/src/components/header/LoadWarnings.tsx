import React from 'react'

import Warning from '@mui/icons-material/Warning'
import { Button, Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

// A failed optional layer, such as a 404 on the annotations or row metadata
// that is not JSON, shows here as a dismissible warning. Setting `error` would
// clear dataInitialized and hide the loaded alignment.
const LoadWarnings = observer(function ({ model }: { model: MsaViewModel }) {
  const { warnings } = model
  if (warnings.length === 0) {
    return null
  }
  return (
    <Tooltip title={`${warnings.join(' ')} (click to dismiss)`}>
      <Button
        aria-label="Dismiss warnings"
        color="warning"
        size="small"
        startIcon={<Warning fontSize="small" />}
        style={{ margin: 'auto', marginLeft: 10, whiteSpace: 'nowrap' }}
        onClick={() => {
          model.clearWarnings()
        }}
      >
        {warnings.length > 1 ? `${warnings.length} warnings` : 'Warning'}
      </Button>
    </Tooltip>
  )
})

export default LoadWarnings

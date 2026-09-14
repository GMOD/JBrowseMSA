import React from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import Warning from '@mui/icons-material/Warning'
import { Tooltip, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const useStyles = makeStyles()(theme => ({
  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    margin: 'auto',
    marginLeft: 10,
    whiteSpace: 'nowrap',
    color: theme.palette.warning.main,
    cursor: 'pointer',
  },
}))

// A failed optional layer, such as a 404 on the annotations or row metadata
// that is not JSON, shows here as a dismissible warning. Setting `error` would
// clear dataInitialized and hide the loaded alignment.
const LoadWarnings = observer(function ({ model }: { model: MsaViewModel }) {
  const { warnings } = model
  const { classes } = useStyles()
  if (warnings.length === 0) {
    return null
  }
  return (
    <Tooltip title={`${warnings.join(' ')} (click to dismiss)`}>
      <Typography
        component="div"
        className={classes.warning}
        onClick={() => {
          model.clearWarnings()
        }}
      >
        <Warning fontSize="small" />
        {warnings.length > 1 ? `${warnings.length} warnings` : 'Warning'}
      </Typography>
    </Tooltip>
  )
})

export default LoadWarnings

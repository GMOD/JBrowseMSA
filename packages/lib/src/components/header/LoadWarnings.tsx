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

// An optional layer that failed -- a 404 on the annotations, a row-metadata
// file that is not JSON -- used to go to `error`, which takes dataInitialized
// down with it and replaces a perfectly good alignment with an error screen.
// It says so here instead, and the reader dismisses it.
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

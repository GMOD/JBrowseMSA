import React from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import LinkOff from '@mui/icons-material/LinkOff'
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
    cursor: 'help',
  },
}))

function size(bytes: number) {
  return bytes < 1_000_000
    ? `${Math.round(bytes / 1000)} kB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`
}

// The viewer holds documents its own snapshot does not carry, and until this
// existed it said nothing about it: the view worked, the URL quietly lost the
// data, and whoever copied the link found out from the person who opened it.
// See `unshareableData` on the model.
const UnshareableDataWarning = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { unshareableData } = model
  const { classes } = useStyles()
  if (unshareableData.length === 0) {
    return null
  }
  const what = unshareableData
    .map(({ what, bytes }) => `${what} (${size(bytes)})`)
    .join(' and the ')
  return (
    <Tooltip
      title={`The ${what} came from this computer and is too large to travel in a URL, so a link to this page opens without it. Serve the file over HTTP and open it by URL to share the view.`}
    >
      <Typography component="div" className={classes.warning}>
        <LinkOff fontSize="small" />
        Not in the link
      </Typography>
    </Tooltip>
  )
})

export default UnshareableDataWarning

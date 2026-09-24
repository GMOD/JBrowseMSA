import React from 'react'

import { LoadingEllipses } from '@jbrowse/core/ui'
import { makeStyles } from '@jbrowse/core/util/tss-react'
import { Button, CircularProgress, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../model.ts'

const useStyles = makeStyles()({
  page: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    margin: 'auto',
    marginLeft: 10,
  },
})

/**
 * The model's status line with its Cancel button: a spinner and a heading in
 * place of the view while it loads, or a line in the header afterwards, which
 * disappears when there is no status.
 */
const StatusMessage = observer(function ({
  model,
  variant,
}: {
  model: MsaViewModel
  variant: 'page' | 'header'
}) {
  const { status } = model
  const { classes } = useStyles()
  if (variant === 'header' && !status) {
    return null
  }
  const message = status?.msg ?? 'Loading...'
  const onCancel = status?.onCancel
  return (
    <div className={classes[variant]}>
      {variant === 'page' ? (
        <>
          <CircularProgress size={24} />
          <Typography variant="h6">{message}</Typography>
        </>
      ) : (
        <LoadingEllipses message={message} component="span" />
      )}
      {onCancel ? (
        <Button
          variant={variant === 'page' ? 'outlined' : 'text'}
          size="small"
          onClick={() => {
            onCancel()
          }}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  )
})

export default StatusMessage

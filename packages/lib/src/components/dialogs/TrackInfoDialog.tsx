import React from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { makeStyles } from '@jbrowse/core/util/tss-react'
import { Button, DialogActions, DialogContent, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import CopyButton from '../CopyButton.tsx'

import type { BasicTrack } from '../../types.ts'

const useStyles = makeStyles()(theme => ({
  textArea: {
    padding: theme.spacing(2),
    overflow: 'auto',
    background: '#ddd',
    wordBreak: 'break-word',
  },
}))

const TrackInfoDialog = observer(function ({
  model,
  onClose,
}: {
  model: BasicTrack['model']
  onClose: () => void
}) {
  const { name, data } = model
  const { classes } = useStyles()
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      title={`Track info - ${name}`}
    >
      <DialogContent>
        {/* the bar tracks (conservation) are computed per column and carry no
            text of their own, so there is nothing to show or copy for them */}
        {data === undefined ? (
          <Typography>This track has no text data.</Typography>
        ) : (
          <>
            <CopyButton text={data} />
            <pre className={classes.textArea}>{data}</pre>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default TrackInfoDialog

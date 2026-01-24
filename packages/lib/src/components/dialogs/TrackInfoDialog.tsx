import React, { useState } from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { Button, DialogActions, DialogContent } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import copy from '../../vendor/copyToClipboard.ts'

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
  model: { name: string; data: string }
  onClose: () => void
}) {
  const [label, setLabel] = useState('Copy to clipboard')
  const { classes } = useStyles()
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      title={`Track info - ${model.name}`}
    >
      <DialogContent>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            copy(model.data)
            setLabel('Copied!')
            setTimeout(() => {
              setLabel('Copy to clipboard')
            }, 300)
          }}
        >
          {label}
        </Button>
        <pre className={classes.textArea}>{model.data}</pre>
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

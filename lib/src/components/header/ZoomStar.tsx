import React from 'react'

import RestartAlt from '@mui/icons-material/RestartAlt'
import { IconButton } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import type { MsaViewModel } from '../../model.ts'

const useStyles = makeStyles()(theme => ({
  dpad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  icon: {
    padding: theme.spacing(0.5),
  },
}))

const ZoomStar = observer(function ({ model }: { model: MsaViewModel }) {
  const { classes } = useStyles()
  return (
    <div className={classes.dpad}>
      <div />
      <IconButton
        className={classes.icon}
        onClick={() => {
          model.zoomInVertical()
        }}
      >
        Y+
      </IconButton>
      <div />

      <IconButton
        className={classes.icon}
        onClick={() => {
          model.zoomOutHorizontal()
        }}
      >
        X-
      </IconButton>
      <IconButton
        className={classes.icon}
        onClick={() => {
          model.resetZoom()
        }}
      >
        <RestartAlt />
      </IconButton>
      <IconButton
        className={classes.icon}
        onClick={() => {
          model.zoomInHorizontal()
        }}
      >
        X+
      </IconButton>

      <div />
      <IconButton
        className={classes.icon}
        onClick={() => {
          model.zoomOutVertical()
        }}
      >
        Y-
      </IconButton>
      <div />
    </div>
  )
})

export default ZoomStar

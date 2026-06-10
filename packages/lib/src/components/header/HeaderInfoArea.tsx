import React from 'react'

import { Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import type { MsaViewModel } from '../../model.ts'

const useStyles = makeStyles()({
  container: {
    display: 'flex',
    overflow: 'hidden',
    margin: 'auto',
    marginLeft: 10,
  },
  nameFirst: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  nameRest: {
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
})

const HeaderInfoArea = observer(function ({ model }: { model: MsaViewModel }) {
  const { mouseOverRowName, mouseCol } = model
  const { classes } = useStyles()
  if (!mouseOverRowName || mouseCol === undefined) {
    return null
  }
  const mid = Math.floor(mouseOverRowName.length / 2)
  const pos = model.visibleColToSeqPosOneBased(mouseOverRowName, mouseCol)
  const letter = model.visibleColToRowLetter(mouseOverRowName, mouseCol)
  return (
    <Typography
      component="div"
      className={classes.container}
      title={mouseOverRowName}
    >
      <span className={classes.nameFirst}>{mouseOverRowName.slice(0, mid)}</span>
      <span className={classes.nameRest}>
        {mouseOverRowName.slice(mid)}:{pos} ({letter})
      </span>
    </Typography>
  )
})

export default HeaderInfoArea

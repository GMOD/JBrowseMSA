import React, { lazy, useCallback, useRef, useState } from 'react'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import { useWheelScroll } from '../useWheelScroll.ts'

import type { MsaViewModel } from '../model.ts'

const TrackInfoDialog = lazy(() => import('./dialogs/TrackInfoDialog.tsx'))

const useStyles = makeStyles()({
  button: {
    padding: 0,
  },
})

const TrackLabel = observer(function TrackLabel({
  model,
  track,
}: {
  model: MsaViewModel
  track: any
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement>()
  const { drawLabels, rowHeight, treeAreaWidth: width } = model
  const {
    model: { name, height },
  } = track
  const { classes } = useStyles()
  const trackLabelHeight = Math.max(8, rowHeight - 8)

  return (
    <div
      style={{
        width,
        height,
        flexShrink: 0,
        textAlign: 'right',
        fontSize: trackLabelHeight,
      }}
    >
      {drawLabels ? name : ''}{' '}
      <IconButton
        className={classes.button}
        style={{
          width: trackLabelHeight,
          height: trackLabelHeight,
        }}
        onClick={event => {
          setAnchorEl(event.currentTarget)
        }}
      >
        <ArrowDropDownIcon />
      </IconButton>
      {anchorEl ? (
        <Menu
          anchorEl={anchorEl}
          transitionDuration={0}
          open
          onClose={() => {
            setAnchorEl(undefined)
          }}
        >
          <MenuItem
            dense
            onClick={() => {
              model.toggleTrack(track.model.id)
              setAnchorEl(undefined)
            }}
          >
            Close
          </MenuItem>
          <MenuItem
            dense
            onClick={() => {
              model.queueDialog(onClose => [
                TrackInfoDialog,
                { onClose, model: track.model },
              ])
              setAnchorEl(undefined)
            }}
          >
            Get info
          </MenuItem>
        </Menu>
      ) : null}
    </div>
  )
})

const Track = observer(function ({
  model,
  track,
}: {
  model: MsaViewModel
  track: any
}) {
  const { resizeHandleWidth, colWidth, scrollX, numColumns } = model
  const {
    model: { height, error },
  } = track
  const ref = useRef<HTMLDivElement>(null)
  const onScrollX = useCallback(
    (d: number) => {
      model.doScrollX(d)
    },
    [model],
  )
  useWheelScroll({ ref, onScrollX })

  return (
    <div key={track.id} style={{ display: 'flex', height }}>
      <TrackLabel model={model} track={track} />
      <div style={{ width: resizeHandleWidth, flexShrink: 0 }} />
      <div
        ref={ref}
        onMouseMove={event => {
          if (!ref.current) {
            return
          }
          const { left } = ref.current.getBoundingClientRect()
          const mouseX = event.clientX - left - scrollX
          const col = Math.floor(mouseX / colWidth)
          if (col >= 0 && col < numColumns) {
            model.setMousePos(col, undefined)
          } else {
            model.setMousePos(undefined, undefined)
          }
        }}
        onMouseLeave={() => {
          model.setMousePos(undefined, undefined)
        }}
      >
        {error ? (
          <div style={{ color: 'red', fontSize: 10 }}>{`${error}`}</div>
        ) : (
          <track.ReactComponent model={model} track={track} />
        )}
      </div>
    </div>
  )
})

export default Track

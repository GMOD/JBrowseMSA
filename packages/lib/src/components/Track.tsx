import React, { lazy, useCallback, useRef, useState } from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { observer } from 'mobx-react'

import { useWheelScroll } from '../useWheelScroll.ts'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack } from '../types.ts'

const TrackInfoDialog = lazy(() => import('./dialogs/TrackInfoDialog.tsx'))

const useStyles = makeStyles()(theme => ({
  button: {
    padding: 0,
  },
  // a hairline under every track but the last, across the labels as well as
  // the alignment. The divider a track's resize handle draws covers only the
  // alignment, and tracks sharing a height have no handle between them. Inset,
  // so the line costs no layout height: totalTrackAreaHeight sums the model's
  // heights, and the column indicator is drawn against that sum
  row: {
    display: 'flex',
    '&:not(:last-child)': {
      boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
    },
  },
}))

const TrackLabel = observer(function TrackLabel({
  model,
  track,
}: {
  model: MsaViewModel
  track: BasicTrack
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement>()
  const closeMenu = () => {
    setAnchorEl(undefined)
  }
  const { drawLabels, fontSize, treeAreaWidth: width } = model
  const {
    model: { name, height },
  } = track
  const { classes } = useStyles()
  const trackLabelHeight = Math.min(height, fontSize)

  return (
    // a flex row, not inline text: zooming in grows fontSize against a tree
    // area the leaf labels sized, and a name that wrapped took its menu button
    // onto a second line, under the next track's button
    <div
      style={{
        width,
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        gap: 2,
        fontSize: trackLabelHeight,
      }}
    >
      <span
        title={name}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {drawLabels ? name : ''}
      </span>
      <IconButton
        className={classes.button}
        style={{
          width: trackLabelHeight,
          height: trackLabelHeight,
          flexShrink: 0,
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
            closeMenu()
          }}
        >
          <MenuItem
            dense
            onClick={() => {
              model.toggleTrack(track.model.id)
              closeMenu()
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
              closeMenu()
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
  track: BasicTrack
}) {
  const { resizeHandleWidth, colWidth, scrollX, numColumns } = model
  const {
    model: { height },
  } = track
  const ref = useRef<HTMLDivElement>(null)
  const onScrollX = useCallback(
    (d: number) => {
      model.doScrollX(d)
    },
    [model],
  )
  useWheelScroll({ ref, onScrollX })
  const { classes } = useStyles()

  return (
    <div className={classes.row} style={{ height }}>
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
        <track.ReactComponent model={model} track={track} />
      </div>
    </div>
  )
})

export default Track

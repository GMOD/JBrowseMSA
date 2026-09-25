import React, { lazy, useCallback, useRef, useState } from 'react'

import BaseTooltip from '@jbrowse/core/ui/BaseTooltip'
import { makeStyles } from '@jbrowse/core/util/tss-react'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { observer } from 'mobx-react'

import { useWheelScroll } from '../useWheelScroll.ts'
import { onMsaKey } from './msa/msaKeys.ts'
import TrackTooltipContent from './tracks/TrackTooltipContent.tsx'
import { useTrackHover } from './tracks/useTrackHover.ts'

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
        aria-label={`${name} track menu`}
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
            Hide track
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
  const { resizeHandleWidth, rowPanelsWidth, showColumnStats } = model
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
  const { anchor, onMouseMove, onMouseDown, onMouseLeave } = useTrackHover({
    model,
    tooltip: showColumnStats,
  })

  return (
    <div className={classes.row} style={{ height }}>
      <TrackLabel model={model} track={track} />
      {/* the row panels are row space, so a track leaves their column empty
      and starts where the alignment canvas does */}
      <div
        style={{ width: rowPanelsWidth + resizeHandleWidth, flexShrink: 0 }}
      />
      <div
        ref={ref}
        data-testid={`track_${track.model.id}`}
        tabIndex={-1}
        style={{ outline: 'none' }}
        onKeyDown={event => {
          if (onMsaKey(model, event)) {
            event.preventDefault()
          }
        }}
        onMouseMove={event => {
          if (ref.current) {
            onMouseMove(event, ref.current)
          }
        }}
        onMouseDown={event => {
          if (ref.current) {
            onMouseDown(event, ref.current)
          }
        }}
        onMouseLeave={() => {
          onMouseLeave()
        }}
      >
        <track.ReactComponent model={model} track={track} />
        {anchor ? (
          <BaseTooltip clientPoint={anchor.clientPoint}>
            <TrackTooltipContent
              model={model}
              track={track}
              col={anchor.value}
            />
          </BaseTooltip>
        ) : null}
      </div>
    </div>
  )
})

export default Track

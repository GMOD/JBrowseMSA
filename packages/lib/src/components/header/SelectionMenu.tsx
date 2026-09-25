import React, { useState } from 'react'

import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import Clear from '@mui/icons-material/Clear'
import ContentCopy from '@mui/icons-material/ContentCopy'
import ZoomIn from '@mui/icons-material/ZoomIn'
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { observer } from 'mobx-react'

import copy from '../../vendor/copyToClipboard.ts'

import type { MsaViewModel } from '../../model.ts'

function count(n: number, noun: string) {
  return `${n.toLocaleString('en-US')} ${noun}${n === 1 ? '' : 's'}`
}

/**
 * The selected block's size, as a button opening what to do with it. It
 * renders only while there is a selection. Header.tsx puts it in the slot
 * with no width of its own, so the label ellipsizes before it could wrap the
 * header onto a second line.
 */
const SelectionMenu = observer(function ({ model }: { model: MsaViewModel }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>()
  const { selectionSize, selectionFileSpan } = model
  if (!selectionSize || !selectionFileSpan) {
    return null
  }
  const label = `${count(selectionSize.columns, 'column')} × ${count(selectionSize.rows, 'row')}`
  const items = [
    {
      text: 'Copy as FASTA',
      Icon: ContentCopy,
      act: () => {
        copy(model.selectionFasta)
      },
    },
    {
      text: 'Zoom to selection',
      Icon: ZoomIn,
      act: () => {
        model.zoomToSelection()
      },
    },
    {
      text: 'Clear selection',
      Icon: Clear,
      act: () => {
        model.clearSelection()
      },
    },
  ]
  return (
    <>
      <Tooltip
        title={`Columns ${selectionFileSpan.start}-${selectionFileSpan.end} selected. Shift-drag the alignment to select, Escape to clear`}
      >
        <Button
          size="small"
          aria-label={`Selection: ${label}`}
          endIcon={<ArrowDropDown />}
          onClick={event => {
            setAnchorEl(event.currentTarget)
          }}
          style={{
            margin: 'auto 0 auto 8px',
            flexShrink: 0,
            maxWidth: '100%',
            minWidth: 0,
            textTransform: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        </Button>
      </Tooltip>
      {anchorEl ? (
        <Menu
          anchorEl={anchorEl}
          open
          transitionDuration={0}
          onClose={() => {
            setAnchorEl(undefined)
          }}
        >
          {items.map(({ text, Icon, act }) => (
            <MenuItem
              key={text}
              dense
              onClick={() => {
                act()
                setAnchorEl(undefined)
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{text}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      ) : null}
    </>
  )
})

export default SelectionMenu

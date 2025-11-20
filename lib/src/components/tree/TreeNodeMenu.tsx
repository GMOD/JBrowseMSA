import React, { lazy } from 'react'

import { Menu, MenuItem } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model'

// lazies
const TreeNodeInfoDialog = lazy(() => import('./dialogs/TreeNodeInfoDialog'))

const TreeMenu = observer(function ({
  node,
  onClose,
  model,
}: {
  node: {
    x: number
    y: number
    name: string
    id: string
  }
  model: MsaViewModel
  onClose: () => void
}) {
  const { collapsed, collapsedLeaves } = model
  const { name } = node
  return (
    <Menu
      anchorReference="anchorPosition"
      anchorPosition={{
        top: node.y,
        left: node.x,
      }}
      transitionDuration={0}
      keepMounted
      open={Boolean(node)}
      onClose={onClose}
    >
      <MenuItem dense disabled>
        {name}
      </MenuItem>

      <MenuItem
        dense
        onClick={() => {
          model.queueDialog(onClose => [
            TreeNodeInfoDialog,
            {
              info: model.getRowData(name),
              model,
              nodeName: name,
              onClose,
            },
          ])
          onClose()
        }}
      >
        More info...
      </MenuItem>
      <MenuItem
        dense
        onClick={() => {
          if (collapsed.includes(node.id)) {
            model.toggleCollapsed(node.id)
          } else {
            if (node.id.endsWith('-leafnode')) {
              model.toggleCollapsedLeaf(node.id)
            } else {
              model.toggleCollapsedLeaf(`${node.id}-leafnode`)
            }
          }
          onClose()
        }}
      >
        {collapsed.includes(node.id) || collapsedLeaves.includes(node.id)
          ? 'Show node'
          : 'Hide node'}
      </MenuItem>
      <MenuItem
        dense
        onClick={() => {
          model.drawRelativeTo(node.name)
          onClose()
        }}
      >
        Indicate differences from this row
      </MenuItem>
      {model.relativeTo ? (
        <MenuItem
          dense
          onClick={() => {
            model.drawRelativeTo(undefined)
            onClose()
          }}
        >
          Clear reference row
        </MenuItem>
      ) : null}
    </Menu>
  )
})

export default TreeMenu

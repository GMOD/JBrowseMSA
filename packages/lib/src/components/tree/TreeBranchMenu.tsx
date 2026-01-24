import React from 'react'

import { Menu, MenuItem } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

interface Node {
  x: number
  y: number
  name: string
  id: string
}

const TreeBranchMenu = observer(function ({
  node,
  model,
  onClose,
}: {
  node: Node
  model: MsaViewModel
  onClose: () => void
}) {
  return (
    <Menu
      anchorReference="anchorPosition"
      anchorPosition={{
        left: node.x,
        top: node.y,
      }}
      transitionDuration={0}
      keepMounted
      open={Boolean(node)}
      onClose={onClose}
    >
      <MenuItem dense disabled>
        {node.name}
      </MenuItem>
      <MenuItem
        dense
        onClick={() => {
          model.toggleCollapsed(node.id)
          onClose()
        }}
      >
        {model.collapsed.includes(node.id)
          ? 'Expand this node'
          : 'Collapse this node'}
      </MenuItem>
      <MenuItem
        dense
        onClick={() => {
          if (model.showOnly === node.id) {
            model.setShowOnly(undefined)
          } else {
            model.setShowOnly(node.id)
          }
          onClose()
        }}
      >
        {model.showOnly === node.id
          ? 'Disable show only this node'
          : 'Show only this node'}
      </MenuItem>
    </Menu>
  )
})

export default TreeBranchMenu

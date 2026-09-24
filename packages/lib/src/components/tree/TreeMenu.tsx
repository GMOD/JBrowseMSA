import React, { lazy } from 'react'

import { Menu, MenuItem } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const TreeNodeInfoDialog = lazy(
  () => import('./dialogs/TreeNodeInfoDialog.tsx'),
)

export interface TreeMenuTarget {
  x: number
  y: number
  name: string
  id: string
  leaf: boolean
}

const TreeMenu = observer(function ({
  node,
  model,
  onClose,
}: {
  node: TreeMenuTarget
  model: MsaViewModel
  onClose: () => void
}) {
  const { collapsed, showOnly, relativeTo } = model
  const { name, id, leaf } = node
  const isCollapsed = collapsed.includes(id)
  const isRoot = id === model.tree.id
  const noun = leaf ? 'subtree' : 'this node'
  return (
    <Menu
      anchorReference="anchorPosition"
      anchorPosition={{ left: node.x, top: node.y }}
      transitionDuration={0}
      open
      onClose={onClose}
    >
      <MenuItem dense disabled>
        {name}
      </MenuItem>
      {leaf ? (
        <MenuItem
          dense
          onClick={() => {
            model.queueDialog(onClose => [
              TreeNodeInfoDialog,
              { info: model.getRowData(name), model, nodeName: name, onClose },
            ])
            onClose()
          }}
        >
          More info...
        </MenuItem>
      ) : null}
      <MenuItem
        dense
        onClick={() => {
          model.toggleCollapsed(id)
          onClose()
        }}
      >
        {isCollapsed ? `Expand ${noun}` : `Collapse ${noun}`}
      </MenuItem>
      {leaf ? null : (
        <MenuItem
          dense
          onClick={() => {
            model.setShowOnly(showOnly === id ? undefined : id)
            onClose()
          }}
        >
          {showOnly === id
            ? 'Disable show only this node'
            : 'Show only this node'}
        </MenuItem>
      )}
      {leaf ? null : (
        <MenuItem
          dense
          onClick={() => {
            model.toggleRotated(id)
            onClose()
          }}
        >
          Rotate this node
        </MenuItem>
      )}
      {isRoot ? null : (
        <MenuItem
          dense
          onClick={() => {
            model.rerootAt(id)
            onClose()
          }}
        >
          Reroot here
        </MenuItem>
      )}
      {leaf ? (
        <MenuItem
          dense
          onClick={() => {
            model.drawRelativeTo(name)
            onClose()
          }}
        >
          Indicate differences from this row
        </MenuItem>
      ) : null}
      {leaf && relativeTo ? (
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

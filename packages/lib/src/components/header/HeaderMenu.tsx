import React, { lazy } from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import AccountTree from '@mui/icons-material/AccountTree'
import Assignment from '@mui/icons-material/Assignment'
import FolderOpen from '@mui/icons-material/FolderOpen'
import MoreVert from '@mui/icons-material/Menu'
import PhotoCamera from '@mui/icons-material/PhotoCamera'
import Visibility from '@mui/icons-material/Visibility'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

// lazies
const MetadataDialog = lazy(() => import('../dialogs/MetadataDialog.tsx'))
const ExportSVGDialog = lazy(() => import('../dialogs/ExportSVGDialog.tsx'))
const SettingsDialog = lazy(() => import('../dialogs/SettingsDialog.tsx'))

const HeaderMenu = observer(({ model }: { model: MsaViewModel }) => {
  const { tracks, turnedOffTracks } = model
  return (
    <CascadingMenuButton
      menuItems={[
        {
          label: 'Return to import form',
          icon: FolderOpen,
          onClick: () => {
            model.reset()
          },
        },
        {
          label: 'Metadata',
          icon: Assignment,
          onClick: () => {
            model.queueDialog(onClose => [
              MetadataDialog,
              {
                model,
                onClose,
              },
            ])
          },
        },
        {
          label: 'More settings',
          onClick: () => {
            model.queueDialog(onClose => [
              SettingsDialog,
              {
                model,
                onClose,
              },
            ])
          },
        },
        {
          label: 'Tracks',
          icon: Visibility,
          type: 'subMenu',
          subMenu: tracks.map(track => ({
            label: track.model.name,
            type: 'checkbox' as const,
            checked: !turnedOffTracks.has(track.model.id),
            onClick: () => {
              model.toggleTrack(track.model.id)
            },
          })),
        },
        {
          label: 'Export SVG',
          icon: PhotoCamera,
          onClick: () => {
            model.queueDialog(onClose => [
              ExportSVGDialog,
              {
                onClose,
                model,
              },
            ])
          },
        },
        ...(model.rows.length >= 2
          ? [
              {
                label: 'Calculate neighbor joining tree (BLOSUM62)',
                icon: AccountTree,
                onClick: () => {
                  try {
                    model.calculateNeighborJoiningTreeFromMSA()
                  } catch (e) {
                    console.error('Failed to calculate NJ tree:', e)
                    model.setError(e)
                  }
                },
              },
            ]
          : []),
        ...model.extraViewMenuItems(),
      ]}
    >
      <MoreVert />
    </CascadingMenuButton>
  )
})

export default HeaderMenu

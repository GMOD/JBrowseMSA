import React, { lazy } from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import Assignment from '@mui/icons-material/Assignment'
import FolderOpen from '@mui/icons-material/FolderOpen'
import PhotoCamera from '@mui/icons-material/PhotoCamera'
import Settings from '@mui/icons-material/Settings'
import { observer } from 'mobx-react'

import { getDomainMenu } from './DomainsMenu.tsx'

import type { MsaViewModel } from '../../model.ts'

const MetadataDialog = lazy(() => import('../dialogs/MetadataDialog.tsx'))
const ExportSVGDialog = lazy(() => import('../dialogs/ExportSVGDialog.tsx'))
const SettingsDialog = lazy(() => import('../dialogs/SettingsDialog.tsx'))

const FileMenu = observer(({ model }: { model: MsaViewModel }) => {
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
          icon: Settings,
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
          label: 'Domain settings',
          type: 'subMenu',
          subMenu: getDomainMenu({
            model,
          }),
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
      ]}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <FolderOpen />
    </CascadingMenuButton>
  )
})

export default FileMenu

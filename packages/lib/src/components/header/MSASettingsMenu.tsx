import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import Tune from '@mui/icons-material/Tune'
import { observer } from 'mobx-react'

import { msaSettingsMenuItems } from './settingsMenuItems.ts'

import type { MsaViewModel } from '../../model.ts'

const MSASettingsMenu = observer(function ({ model }: { model: MsaViewModel }) {
  return (
    <CascadingMenuButton
      data-testid="msa_settings_menu"
      closeAfterItemClick={false}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      menuItems={msaSettingsMenuItems(model)}
    >
      <Tune />
    </CascadingMenuButton>
  )
})

export default MSASettingsMenu

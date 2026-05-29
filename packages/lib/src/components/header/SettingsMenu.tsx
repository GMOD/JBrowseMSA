import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import AccountTree from '@mui/icons-material/AccountTree'
import Palette from '@mui/icons-material/Palette'
import Settings from '@mui/icons-material/Settings'
import { observer } from 'mobx-react'

import {
  msaSettingsMenuItems,
  treeSettingsMenuItems,
} from './settingsMenuItems.ts'
import colorSchemes from '../../colorSchemes.ts'

import type { MsaViewModel } from '../../model.ts'

const SettingsMenu = observer(function ({ model }: { model: MsaViewModel }) {
  const { colorSchemeName } = model
  return (
    <CascadingMenuButton
      closeAfterItemClick={false}
      menuItems={[
        {
          label: 'Color scheme',
          icon: Palette,
          type: 'subMenu',
          subMenu: Object.keys(colorSchemes).map(
            option =>
              ({
                label: option,
                type: 'radio',
                checked: colorSchemeName === option,
                onClick: () => {
                  model.setColorSchemeName(option)
                },
              }) as const,
          ),
        },
        {
          label: 'MSA settings',
          type: 'subMenu',
          subMenu: msaSettingsMenuItems(model),
        },
        {
          label: 'Tree settings',
          type: 'subMenu',
          icon: AccountTree,
          subMenu: treeSettingsMenuItems(model),
        },
      ]}
    >
      <Settings />
    </CascadingMenuButton>
  )
})

export default SettingsMenu

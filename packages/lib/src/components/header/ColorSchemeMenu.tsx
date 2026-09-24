import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import Palette from '@mui/icons-material/Palette'
import { observer } from 'mobx-react'

import colorSchemes from '../../colorSchemes.ts'

import type { MsaViewModel } from '../../model.ts'

// While a `customColorScheme` map is set, a checked Custom entry stands for it
// and no named scheme is checked. Picking a named scheme clears the map.
export function colorSchemeMenuItems(model: MsaViewModel) {
  const { colorSchemeName, customColorScheme } = model
  const custom = customColorScheme
    ? [
        {
          label: 'Custom',
          type: 'radio',
          checked: true,
          onClick: () => {},
        } as const,
      ]
    : []
  return [
    ...custom,
    ...Object.keys(colorSchemes).map(
      option =>
        ({
          label: option,
          type: 'radio',
          checked: !customColorScheme && colorSchemeName === option,
          onClick: () => {
            model.setColorSchemeName(option)
          },
        }) as const,
    ),
  ]
}

const ColorSchemeMenu = observer(function ({ model }: { model: MsaViewModel }) {
  return (
    <CascadingMenuButton
      data-testid="color_scheme_menu"
      tooltip="Color scheme"
      closeAfterItemClick
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      menuItems={colorSchemeMenuItems(model)}
    >
      <Palette />
    </CascadingMenuButton>
  )
})

export default ColorSchemeMenu

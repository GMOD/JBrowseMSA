import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import Palette from '@mui/icons-material/Palette'
import { observer } from 'mobx-react'

import colorSchemes from '../../colorSchemes.ts'

import type { MsaViewModel } from '../../model.ts'

const ColorSchemeMenu = observer(function ({ model }: { model: MsaViewModel }) {
  const { colorSchemeName } = model
  return (
    <CascadingMenuButton
      closeAfterItemClick
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      menuItems={Object.keys(colorSchemes).map(
        option =>
          ({
            label: option,
            type: 'radio',
            checked: colorSchemeName === option,
            onClick: () => {
              model.setColorSchemeName(option)
            },
          }) as const,
      )}
    >
      <Palette />
    </CascadingMenuButton>
  )
})

export default ColorSchemeMenu

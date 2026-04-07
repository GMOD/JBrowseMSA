import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import Tune from '@mui/icons-material/Tune'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const MSASettingsMenu = observer(function ({ model }: { model: MsaViewModel }) {
  const { drawMsaLetters, hideGaps, bgColor } = model
  return (
    <CascadingMenuButton
      closeAfterItemClick={false}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      menuItems={[
        {
          label: 'Draw letters',
          type: 'checkbox',
          checked: drawMsaLetters,
          onClick: () => {
            model.setDrawMsaLetters(!drawMsaLetters)
          },
        },
        {
          label: 'Color letters instead of background of tiles',
          type: 'checkbox',
          checked: !bgColor,
          onClick: () => {
            model.setBgColor(!bgColor)
          },
        },
        {
          label: 'Enable hiding gappy columns?',
          type: 'checkbox',
          checked: hideGaps,
          onClick: () => {
            model.setHideGaps(!hideGaps)
          },
        },
      ]}
    >
      <Tune />
    </CascadingMenuButton>
  )
})

export default MSASettingsMenu

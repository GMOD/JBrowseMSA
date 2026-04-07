import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import MoreVert from '@mui/icons-material/Menu'
import Visibility from '@mui/icons-material/Visibility'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const HeaderMenu = observer(({ model }: { model: MsaViewModel }) => {
  const { tracks, turnedOffTracks } = model
  return (
    <CascadingMenuButton
      menuItems={[
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
        ...model.extraViewMenuItems(),
      ]}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <MoreVert />
    </CascadingMenuButton>
  )
})

export default HeaderMenu

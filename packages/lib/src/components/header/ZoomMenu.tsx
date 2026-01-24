import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import MoreVert from '@mui/icons-material/MoreVert'
import RestartAlt from '@mui/icons-material/RestartAlt'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const ZoomMenu = observer(function ({ model }: { model: MsaViewModel }) {
  return (
    <CascadingMenuButton
      menuItems={[
        {
          label: 'Fit both vertically/horizontally',
          onClick: () => {
            model.fit()
          },
        },
        {
          label: 'Fit vertically',
          onClick: () => {
            model.fitVertically()
          },
        },
        {
          label: 'Fit horizontally',
          onClick: () => {
            model.fitHorizontally()
          },
        },

        {
          label: 'Reset zoom to default',
          icon: RestartAlt,
          onClick: () => {
            model.resetZoom()
          },
        },
        {
          label: 'Show extra zoom options',
          checked: model.showZoomStar,
          type: 'checkbox',
          onClick: () => {
            model.setShowZoomStar(!model.showZoomStar)
          },
        },
      ]}
    >
      <MoreVert />
    </CascadingMenuButton>
  )
})

export default ZoomMenu

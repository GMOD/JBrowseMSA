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
          label: 'Scroll zoom',
          type: 'checkbox',
          checked: model.scrollZoom,
          onClick: () => {
            model.setScrollZoom(!model.scrollZoom)
          },
          helpText:
            'When enabled, scrolling the mouse wheel zooms in and out without holding ctrl. Hold shift to pan instead. Ctrl/⌘+wheel always zooms.',
        },
      ]}
    >
      <MoreVert />
    </CascadingMenuButton>
  )
})

export default ZoomMenu

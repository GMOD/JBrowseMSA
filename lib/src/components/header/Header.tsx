import React, { lazy, useEffect } from 'react'

import useMeasure from '@jbrowse/core/util/useMeasure'
import Help from '@mui/icons-material/Help'
import { IconButton } from '@mui/material'
import { observer } from 'mobx-react'

import GappynessSlider from './GappynessSlider'
import HeaderInfoArea from './HeaderInfoArea'
import HeaderMenu from './HeaderMenu'
import HeaderStatusArea from './HeaderStatusArea'
import MultiAlignmentSelector from './MultiAlignmentSelector'
import SettingsMenu from './SettingsMenu'
import ZoomControls from './ZoomControls'
import ZoomMenu from './ZoomMenu'
import ZoomStar from './ZoomStar'

import type { MsaViewModel } from '../../model'

const AboutDialog = lazy(() => import('../dialogs/AboutDialog'))

const Header = observer(function ({ model }: { model: MsaViewModel }) {
  const [ref, { height }] = useMeasure()
  useEffect(() => {
    model.setHeaderHeight(height || 0)
  }, [model, height])
  return (
    <div ref={ref} style={{ display: 'flex' }}>
      <HeaderMenu model={model} />
      <SettingsMenu model={model} />
      <ZoomControls model={model} />
      {model.showZoomStar ? <ZoomStar model={model} /> : null}
      <ZoomMenu model={model} />
      <GappynessSlider model={model} />
      <div style={{ paddingLeft: 20, margin: 'auto' }}>
        <MultiAlignmentSelector model={model} />
      </div>
      <HeaderInfoArea model={model} />
      <Spacer />
      <HeaderStatusArea model={model} />
      <IconButton
        onClick={() => {
          model.queueDialog(onClose => [AboutDialog, { onClose }])
        }}
      >
        <Help />
      </IconButton>
    </div>
  )
})

function Spacer() {
  return <div style={{ flex: 1 }} />
}

export default Header

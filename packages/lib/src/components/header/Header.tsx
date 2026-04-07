import React, { lazy, useEffect } from 'react'

import useMeasure from '@jbrowse/core/util/useMeasure'
import Help from '@mui/icons-material/Help'
import { IconButton } from '@mui/material'
import { observer } from 'mobx-react'

import GappynessSlider from './GappynessSlider.tsx'
import HeaderInfoArea from './HeaderInfoArea.tsx'
import HeaderMenu from './HeaderMenu.tsx'
import HeaderStatusArea from './HeaderStatusArea.tsx'
import MultiAlignmentSelector from './MultiAlignmentSelector.tsx'
import SettingsMenu from './SettingsMenu.tsx'
import ZoomControls from './ZoomControls.tsx'
import ZoomMenu from './ZoomMenu.tsx'

import type { MsaViewModel } from '../../model.ts'

const AboutDialog = lazy(() => import('../dialogs/AboutDialog.tsx'))

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

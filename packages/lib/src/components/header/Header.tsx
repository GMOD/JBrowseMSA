import React, { lazy, useEffect } from 'react'

import useMeasure from '@jbrowse/core/util/useMeasure'
import Help from '@mui/icons-material/Help'
import { IconButton, Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import StatusMessage from '../StatusMessage.tsx'
import ColorSchemeMenu from './ColorSchemeMenu.tsx'
import FileMenu from './FileMenu.tsx'
import GappynessSlider from './GappynessSlider.tsx'
import HeaderInfoArea from './HeaderInfoArea.tsx'
import LoadWarnings from './LoadWarnings.tsx'
import MSASettingsMenu from './MSASettingsMenu.tsx'
import MultiAlignmentSelector from './MultiAlignmentSelector.tsx'
import RowSearch from './RowSearch.tsx'
import TreeSettingsMenu from './TreeSettingsMenu.tsx'
import UnshareableDataWarning from './UnshareableDataWarning.tsx'
import ZoomControls from './ZoomControls.tsx'
import ZoomMenu from './ZoomMenu.tsx'

import type { MsaViewModel } from '../../model.ts'

const AboutDialog = lazy(() => import('../dialogs/AboutDialog.tsx'))

const Header = observer(function ({ model }: { model: MsaViewModel }) {
  const [ref, { height }] = useMeasure()
  useEffect(() => {
    model.setHeaderHeight(height ?? 0)
  }, [model, height])
  useEffect(
    () => () => {
      model.setHeaderHeight(0)
    },
    [model],
  )
  return (
    <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap' }}>
      <FileMenu model={model} />
      <ColorSchemeMenu model={model} />
      <TreeSettingsMenu model={model} />
      <MSASettingsMenu model={model} />
      <ZoomControls model={model} />
      <ZoomMenu model={model} />
      <GappynessSlider model={model} />
      <RowSearch model={model} />
      <div style={{ paddingLeft: 20, margin: 'auto' }}>
        <MultiAlignmentSelector model={model} />
      </div>
      <HeaderInfoArea model={model} />
      <Spacer />
      <LoadWarnings model={model} />
      <UnshareableDataWarning model={model} />
      <StatusMessage model={model} variant="header" />
      <Tooltip title="About">
        <IconButton
          aria-label="About"
          onClick={() => {
            model.queueDialog(onClose => [AboutDialog, { onClose }])
          }}
        >
          <Help />
        </IconButton>
      </Tooltip>
    </div>
  )
})

function Spacer() {
  return <div style={{ flex: 1 }} />
}

export default Header

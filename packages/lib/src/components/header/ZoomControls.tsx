import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import { IconButton, Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import {
  MouseScroll,
  MouseZoomBoth,
  MouseZoomHorizontal,
  MouseZoomVertical,
} from './ScrollZoomIcons.tsx'

import type { ScrollZoomAxis } from '../../constants.ts'
import type { MsaViewModel } from '../../model.ts'

interface WheelMode {
  label: string
  // undefined is the wheel scrolling the alignment, which is the default
  axis?: ScrollZoomAxis
  Icon: typeof MouseScroll
  helpText?: string
}

const scrollMode: WheelMode = {
  label: 'Scrolls the alignment',
  Icon: MouseScroll,
  helpText: 'Ctrl+wheel zooms both axes at the cursor.',
}

const wheelModes: WheelMode[] = [
  scrollMode,
  {
    label: 'Zooms both axes',
    axis: 'both',
    Icon: MouseZoomBoth,
    helpText: 'Hold shift to pan while the wheel zooms.',
  },
  {
    label: 'Zooms columns only',
    axis: 'horizontal',
    Icon: MouseZoomHorizontal,
    helpText:
      'Holds the row height, so the labels and letters stay at their size while the alignment compresses.',
  },
  {
    label: 'Zooms rows only',
    axis: 'vertical',
    Icon: MouseZoomVertical,
    helpText:
      'Holds the column width, so the alignment stays as wide while the rows grow or shrink.',
  },
]

const ZoomControls = observer(function ZoomControls({
  model,
}: {
  model: MsaViewModel
}) {
  const { scrollZoom, scrollZoomAxis } = model
  const activeAxis = scrollZoom ? scrollZoomAxis : undefined
  const current = wheelModes.find(m => m.axis === activeAxis) ?? scrollMode
  return (
    <>
      <Tooltip title="Zoom in">
        <IconButton
          aria-label="Zoom in"
          onClick={() => {
            model.zoomIn()
          }}
        >
          <ZoomIn />
        </IconButton>
      </Tooltip>
      <Tooltip title="Zoom out">
        <IconButton
          aria-label="Zoom out"
          onClick={() => {
            model.zoomOut()
          }}
        >
          <ZoomOut />
        </IconButton>
      </Tooltip>
      <CascadingMenuButton
        data-testid="scroll_zoom_menu"
        tooltip={`Mouse wheel: ${current.label.toLowerCase()} (ctrl+wheel always zooms)`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        menuItems={[
          { type: 'subHeader', label: 'Mouse wheel' },
          ...wheelModes.map(({ label, axis, Icon, helpText }) => ({
            label,
            icon: Icon,
            helpText,
            type: 'radio' as const,
            checked: current.label === label,
            onClick: () => {
              model.setScrollZoom(axis !== undefined)
              if (axis !== undefined) {
                model.setScrollZoomAxis(axis)
              }
            },
          })),
        ]}
      >
        <current.Icon />
      </CascadingMenuButton>
    </>
  )
})
export default ZoomControls

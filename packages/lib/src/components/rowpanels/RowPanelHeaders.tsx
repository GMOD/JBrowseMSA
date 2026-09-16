import React from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

/**
 * The strip headers, in a band above the panels beside the tree ruler and the
 * minimap. The text is DOM text turned on its side, since the canvas layer has
 * no rotation; the SVG export draws the same names with a `rotate(-90)`.
 */
const RowPanelHeaders = observer(function ({ model }: { model: MsaViewModel }) {
  const { resolvedRowPanels, rowPanelsHeaderHeight, fontSize } = model
  return resolvedRowPanels.length > 0 ? (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        height: rowPanelsHeaderHeight,
        alignItems: 'flex-end',
      }}
    >
      {resolvedRowPanels.map(panel => (
        <div
          key={panel.id}
          title={panel.header}
          style={{
            width: panel.width,
            height: rowPanelsHeaderHeight,
            fontSize: Math.min(fontSize, panel.width),
            // vertical-rl reads top to bottom, and the half turn makes it read
            // upwards from the strip, which is what rotate(-90) exports
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {panel.header}
        </div>
      ))}
    </div>
  ) : null
})

export default RowPanelHeaders

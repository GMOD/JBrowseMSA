import React from 'react'

import { observer } from 'mobx-react'

import { headerRunsAcross } from './headerLayout.ts'

import type { MsaViewModel } from '../../model.ts'

/**
 * The row panel headers, in a band above the panels beside the tree ruler and
 * the minimap. A narrow strip's name is DOM text turned on its side, since the
 * canvas layer has no rotation, and the SVG export draws it with a
 * `rotate(-90)`. A panel wider than the band is tall writes its name across.
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
      {resolvedRowPanels.map(panel => {
        const across = headerRunsAcross(panel.width)
        return (
          <div
            key={panel.id}
            title={panel.header}
            style={{
              width: panel.width,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...(across
                ? { fontSize, textAlign: 'center' }
                : {
                    height: rowPanelsHeaderHeight,
                    fontSize: Math.min(fontSize, panel.width),
                    // vertical-rl reads top to bottom, and the half turn makes
                    // it read upwards from the strip, as rotate(-90) exports
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }),
            }}
          >
            {panel.header}
          </div>
        )
      })}
    </div>
  ) : null
})

export default RowPanelHeaders
